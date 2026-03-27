const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const TicketModel = require('../models/ticketModel');
const EventModel = require('../models/eventModel');
const NotificationModel = require('../models/notificationModel');

function parsePgTimeToParts(timeValue) {
  if (!timeValue) return null;
  // Accept "HH:MM", "HH:MM:SS", or objects that stringify similarly
  const str = String(timeValue).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const hh = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  const ss = match[3] ? Math.min(59, Math.max(0, parseInt(match[3], 10))) : 0;
  return { hh, mm, ss };
}

function parsePgDateToParts(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    return { yyyy: dateValue.getFullYear(), mm: dateValue.getMonth() + 1, dd: dateValue.getDate() };
  }
  const str = String(dateValue).trim();
  // Accept "YYYY-MM-DD" (common for DATE) or ISO-like strings.
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { yyyy: parseInt(match[1], 10), mm: parseInt(match[2], 10), dd: parseInt(match[3], 10) };
}

function buildLocalDateTime(dateValue, timeValue) {
  const d = parsePgDateToParts(dateValue);
  const t = parsePgTimeToParts(timeValue);
  if (!d || !t) return null;
  return new Date(d.yyyy, d.mm - 1, d.dd, t.hh, t.mm, t.ss, 0);
}

exports.purchaseTicket = async (req, res) => {
  try {
    const { event_id, quantity = 1 } = req.body;

    if (!event_id) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }
    if (quantity < 1 || quantity > 10) {
      return res.status(400).json({ success: false, message: 'Quantity must be between 1 and 10.' });
    }

    const event = await EventModel.findById(event_id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (!event.is_active) return res.status(400).json({ success: false, message: 'This event is no longer active.' });

    const eventEnd = buildLocalDateTime(event.event_date, event.end_time || event.event_time);
    if (eventEnd && new Date() > eventEnd) {
      return res.status(400).json({ success: false, message: 'Registration closed. This event has already ended.' });
    }

    if (event.available_seats < quantity) {
      return res.status(400).json({ success: false, message: `Only ${event.available_seats} seat(s) remaining.` });
    }

    const total_price = event.price * quantity;
    const qr_code = `TICKET-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Decrement seats atomically
    const seat = await EventModel.decrementSeats(event_id, quantity);
    if (!seat) {
      return res.status(400).json({ success: false, message: 'Failed to reserve seats. Please try again.' });
    }

    const ticket = await TicketModel.create({
      user_id: req.user.id,
      event_id,
      quantity,
      total_price,
      qr_code,
    });

    // Create buyer notification. Do not fail purchase if a follow-up notification fails.
    await NotificationModel.create({
      user_id: req.user.id,
      event_id,
      message: `🎟️ Your ticket for "${event.title}" on ${new Date(event.event_date).toLocaleDateString()} is confirmed!`,
      type: 'ticket_confirmed',
    });

    try {
      // Notify organizer and admins so purchases are visible in navbar bell.
      if (event.organizer_id && event.organizer_id !== req.user.id) {
        await NotificationModel.create({
          user_id: event.organizer_id,
          event_id,
          message: `New ticket purchase: ${req.user.name} bought ${quantity} ticket(s) for "${event.title}".`,
          type: 'info',
        });
      }

      const adminUsers = await db.query("SELECT id FROM users WHERE role = 'admin'");
      const adminNotifications = adminUsers.rows
        .filter((admin) => admin.id !== req.user.id && admin.id !== event.organizer_id)
        .map((admin) => NotificationModel.create({
          user_id: admin.id,
          event_id,
          message: `Ticket purchased for "${event.title}" (${quantity} ticket(s)).`,
          type: 'info',
        }));
      await Promise.all(adminNotifications);
    } catch (notifyErr) {
      console.error('Non-blocking notification fan-out error:', notifyErr.message);
    }

    res.status(201).json({ success: true, message: 'Ticket purchased successfully!', data: ticket });
  } catch (err) {
    console.error('Purchase ticket error:', err);
    res.status(500).json({ success: false, message: 'Server error purchasing ticket.' });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await TicketModel.findByUser(req.user.id);
    res.json({ success: true, data: tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.cancelTicket = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { reason = null } = req.body || {};
    const ticketResult = await client.query(
      `SELECT t.*, e.event_date, e.event_time, e.end_time, e.title
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = ticketResult.rows[0];
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this ticket.' });
    }
    if (ticket.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Ticket is already cancelled.' });
    }

    const eventEnd = buildLocalDateTime(ticket.event_date, ticket.end_time || ticket.event_time);
    if (eventEnd && new Date() > eventEnd) {
      return res.status(400).json({ success: false, message: 'Ticket cannot be cancelled after event end time.' });
    }

    await client.query('BEGIN');

    const cancelledResult = await client.query(
      `UPDATE tickets
       SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $1
       WHERE id = $2 AND status <> 'cancelled'
       RETURNING *`,
      [reason, req.params.id]
    );
    const cancelledTicket = cancelledResult.rows[0];
    if (!cancelledTicket) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Unable to cancel ticket.' });
    }

    await client.query(
      `UPDATE events
       SET available_seats = available_seats + $1, updated_at = NOW()
       WHERE id = $2`,
      [cancelledTicket.quantity, cancelledTicket.event_id]
    );

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Ticket cancelled successfully.', data: cancelledTicket });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel ticket error:', err);
    return res.status(500).json({ success: false, message: 'Server error cancelling ticket.' });
  } finally {
    client.release();
  }
};

exports.downloadTicket = async (req, res) => {
  try {
    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (ticket.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled tickets cannot be downloaded.' });
    }

    const ticketContent = [
      'EVENTHUB E-TICKET',
      '-------------------------------',
      `Ticket ID: ${ticket.id}`,
      `QR Code: ${ticket.qr_code || 'N/A'}`,
      `Holder: ${ticket.user_name || 'N/A'}`,
      `Event: ${ticket.event_title || 'N/A'}`,
      `Date: ${ticket.event_date ? new Date(ticket.event_date).toDateString() : 'N/A'}`,
      `Time: ${ticket.event_time || 'N/A'}`,
      `Location: ${ticket.location || 'N/A'}`,
      `Quantity: ${ticket.quantity}`,
      `Total Paid: ${ticket.total_price}`,
      `Status: ${ticket.status}`,
      `Purchased At: ${ticket.purchased_at ? new Date(ticket.purchased_at).toISOString() : 'N/A'}`,
      '-------------------------------',
      'Please carry a valid ID and this ticket at entry.',
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.txt"`);
    return res.status(200).send(ticketContent);
  } catch (err) {
    console.error('Download ticket error:', err);
    return res.status(500).json({ success: false, message: 'Server error downloading ticket.' });
  }
};
