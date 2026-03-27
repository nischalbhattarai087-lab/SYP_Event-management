const EventModel = require('../models/eventModel');
const TicketModel = require('../models/ticketModel');
const EventReviewModel = require('../models/eventReviewModel');

function parsePgTimeToParts(timeValue) {
  if (!timeValue) return null;
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

exports.getMyReviewForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;

    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const eventEnd = buildLocalDateTime(event.event_date, event.end_time || event.event_time);
    const eventExpired = Boolean(eventEnd && new Date() > eventEnd);

    const hasTicket = await TicketModel.existsByUserAndEvent(req.user.id, eventId);
    const myReview = await EventReviewModel.findByUserAndEvent(req.user.id, eventId);

    return res.json({
      success: true,
      data: {
        eventExpired,
        hasTicket,
        hasReview: Boolean(myReview),
        myReview: myReview || null,
      },
    });
  } catch (err) {
    console.error('Get my review error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.upsertMyReview = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { rating, feedback = '' } = req.body || {};

    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Organizer cannot review their own event
    if (event.organizer_id && String(event.organizer_id) === String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Organizers cannot review their own events.' });
    }

    const eventEnd = buildLocalDateTime(event.event_date, event.end_time || event.event_time);
    const eventExpired = Boolean(eventEnd && new Date() > eventEnd);
    if (!eventExpired) {
      return res.status(400).json({ success: false, message: 'You can submit feedback after the event ends.' });
    }

    const hasTicket = await TicketModel.existsByUserAndEvent(req.user.id, eventId);
    if (!hasTicket) {
      return res.status(403).json({ success: false, message: 'Only attendees can leave feedback.' });
    }

    const parsedRating = rating === '' || rating === null || rating === undefined ? null : parseInt(rating, 10);
    if (parsedRating === null || Number.isNaN(parsedRating)) {
      return res.status(400).json({ success: false, message: 'Rating is required (1-5).' });
    }
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    const updated = await EventReviewModel.upsert({
      user_id: req.user.id,
      event_id: eventId,
      rating: parsedRating,
      feedback: feedback || null,
    });

    return res.json({ success: true, message: 'Feedback saved.', data: updated });
  } catch (err) {
    console.error('Upsert review error:', err);
    res.status(500).json({ success: false, message: 'Server error saving feedback.' });
  }
};

exports.getEventReviews = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Only the organizer of this event or an admin can see all reviews
    const isOrganizer = String(event.organizer_id) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const reviews = await EventReviewModel.findByEvent(eventId);
    const stats = await EventReviewModel.avgRatingForEvent(eventId);

    return res.json({
      success: true,
      data: {
        reviews,
        avgRating: stats.avg_rating ? parseFloat(stats.avg_rating) : null,
        totalReviews: parseInt(stats.total, 10),
      },
    });
  } catch (err) {
    console.error('Get event reviews error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
