const db = require('../config/db');
const UserModel = require('../models/userModel');
const EventModel = require('../models/eventModel');
const TicketModel = require('../models/ticketModel');
const NotificationModel = require('../models/notificationModel');

exports.getStats = async (req, res) => {
  try {
    const [userCount, eventCount, ticketCount, revenue] = await Promise.all([
      UserModel.count(),
      EventModel.count(),
      TicketModel.count(),
      TicketModel.totalRevenue(),
    ]);

    // Recent events
    const recentEvents = await db.query(
      'SELECT id, title, event_date, location, available_seats, total_seats FROM events ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      success: true,
      data: {
        totalUsers: userCount,
        totalEvents: eventCount,
        totalTickets: ticketCount,
        totalRevenue: revenue,
        recentEvents: recentEvents.rows,
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching stats.' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const users = await UserModel.getAll({ limit: parseInt(limit), offset: parseInt(offset) });
    const total = await UserModel.count();
    res.json({ success: true, data: users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'organizer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const existingUser = await UserModel.findById(req.params.id);
    if (!existingUser) return res.status(404).json({ success: false, message: 'User not found.' });

    // Enforce single-admin policy: no new admin promotions and no demotion of the only admin.
    if (role === 'admin' && existingUser.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Only one admin account is allowed. Promotion to admin is disabled.' });
    }
    if (existingUser.role === 'admin' && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'The only admin account role cannot be changed.' });
    }

    const user = await UserModel.updateRole(req.params.id, role);
    res.json({ success: true, message: 'User role updated.', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, u.name AS organizer_name FROM events e
       LEFT JOIN users u ON e.organizer_id = u.id
       ORDER BY e.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const EventModel = require('../models/eventModel');
    await EventModel.delete(req.params.id);
    res.json({ success: true, message: 'Event deleted by admin.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.approveEvent = async (req, res) => {
  try {
    const { feedback = '', rating = null } = req.body || {};
    const parsedRating = rating === null || rating === '' ? null : parseInt(rating, 10);
    if (parsedRating !== null && (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }
    const existing = await EventModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const hasFeedback = typeof feedback === 'string' && feedback.trim().length > 0;
    const hasRating = parsedRating !== null;

    const updateFields = {
      is_active: true,
      review_status: 'approved',
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
    };
    if (hasFeedback) updateFields.admin_feedback = feedback;
    if (hasRating) updateFields.admin_rating = parsedRating;

    const updated = await EventModel.update(req.params.id, updateFields);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    if (existing.organizer_id) {
      await NotificationModel.create({
        user_id: existing.organizer_id,
        event_id: existing.id,
        message: feedback || parsedRating
          ? `Your event "${existing.title}" has been approved.${parsedRating ? ` Rating: ${parsedRating}/5.` : ''}${feedback ? ` Admin feedback: ${feedback}` : ''}`
          : `Your event "${existing.title}" has been approved.`,
        type: 'event_update',
      });
    }
    res.json({ success: true, message: 'Event approved successfully.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.rejectEvent = async (req, res) => {
  try {
    const { feedback = '', rating = null } = req.body || {};
    const parsedRating = rating === null || rating === '' ? null : parseInt(rating, 10);
    if (parsedRating !== null && (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }
    const existing = await EventModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const hasFeedback = typeof feedback === 'string' && feedback.trim().length > 0;
    const hasRating = parsedRating !== null;

    const updateFields = {
      is_active: false,
      review_status: 'rejected',
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
    };
    if (hasFeedback) updateFields.admin_feedback = feedback;
    if (hasRating) updateFields.admin_rating = parsedRating;

    const updated = await EventModel.update(req.params.id, updateFields);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    if (existing.organizer_id) {
      await NotificationModel.create({
        user_id: existing.organizer_id,
        event_id: existing.id,
        message: feedback || parsedRating
          ? `Your event "${existing.title}" was rejected.${parsedRating ? ` Rating: ${parsedRating}/5.` : ''}${feedback ? ` Admin feedback: ${feedback}` : ''}`
          : `Your event "${existing.title}" was rejected. Please review and update it.`,
        type: 'event_update',
      });
    }
    res.json({ success: true, message: 'Event rejected with feedback.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.rateEventOrganizer = async (req, res) => {
  try {
    const { feedback = '', rating = null } = req.body || {};
    const parsedRating = rating === null || rating === '' ? null : parseInt(rating, 10);
    if (parsedRating !== null && (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    const existing = await EventModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const updated = await EventModel.update(existing.id, {
      admin_feedback: feedback || null,
      admin_rating: parsedRating,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
    });

    return res.json({ success: true, message: 'Organizer rating updated.', data: updated });
  } catch (err) {
    console.error('Rate organizer error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
