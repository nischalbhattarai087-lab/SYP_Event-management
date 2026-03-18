const { v4: uuidv4 } = require('uuid');
const TicketModel = require('../models/ticketModel');
const EventModel = require('../models/eventModel');
const NotificationModel = require('../models/notificationModel');

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

    // Create notification
    await NotificationModel.create({
      user_id: req.user.id,
      event_id,
      message: `🎟️ Your ticket for "${event.title}" on ${new Date(event.event_date).toLocaleDateString()} is confirmed!`,
      type: 'ticket_confirmed',
    });

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
