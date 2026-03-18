const db = require('../config/db');
const UserModel = require('../models/userModel');
const EventModel = require('../models/eventModel');
const TicketModel = require('../models/ticketModel');

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
    const user = await UserModel.updateRole(req.params.id, role);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
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
