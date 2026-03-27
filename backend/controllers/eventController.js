const EventModel = require('../models/eventModel');
const path = require('path');

exports.getAllEvents = async (req, res) => {
  try {
    const { category, date_from, date_to, location, search, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const events = await EventModel.findAll({ category, date_from, date_to, location, search, limit: parseInt(limit), offset: parseInt(offset) });
    const total = await EventModel.countAll({ category, date_from, date_to, location, search });

    res.json({
      success: true,
      data: events,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching events.' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, category, event_date, event_time, end_time, location, address, total_seats, price } = req.body;

    if (!title || !event_date || !event_time || !end_time || !location || !total_seats || price === undefined) {
      return res.status(400).json({ success: false, message: 'Title, date, start time, end time, location, seats, and price are required.' });
    }

    const poster_url = req.file ? `/uploads/${req.file.filename}` : null;

    const shouldAutoActivate = req.user.role === 'admin';
    const reviewStatus = shouldAutoActivate ? 'approved' : 'pending';
    const event = await EventModel.create({
      title, description, category, event_date, event_time,
      end_time,
      location, address, poster_url,
      organizer_id: req.user.id,
      total_seats: parseInt(total_seats),
      price: parseFloat(price),
      is_active: shouldAutoActivate,
      review_status: reviewStatus,
    });

    const message = shouldAutoActivate
      ? 'Event created successfully.'
      : 'Event submitted successfully. It is now pending admin approval.';
    res.status(201).json({ success: true, message, data: event });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ success: false, message: 'Server error creating event.' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    if (event.organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this event.' });
    }

    const fields = { ...req.body };
    if (req.file) fields.poster_url = `/uploads/${req.file.filename}`;

    const updated = await EventModel.update(req.params.id, fields);
    res.json({ success: true, message: 'Event updated.', data: updated });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ success: false, message: 'Server error updating event.' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    if (event.organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event.' });
    }

    await EventModel.delete(req.params.id);
    res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error deleting event.' });
  }
};

exports.getMyEvents = async (req, res) => {
  try {
    const events = await EventModel.findByOrganizer(req.user.id);
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
