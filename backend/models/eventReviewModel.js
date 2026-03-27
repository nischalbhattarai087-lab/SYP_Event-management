const db = require('../config/db');

const EventReviewModel = {
  async upsert({ user_id, event_id, rating, feedback }) {
    const result = await db.query(
      `INSERT INTO event_reviews (user_id, event_id, rating, feedback)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, event_id) DO UPDATE SET
         rating = EXCLUDED.rating,
         feedback = EXCLUDED.feedback,
         updated_at = NOW()
       RETURNING *`,
      [user_id, event_id, rating, feedback]
    );
    return result.rows[0];
  },

  async findByUserAndEvent(user_id, event_id) {
    const result = await db.query(
      `SELECT * FROM event_reviews
       WHERE user_id = $1 AND event_id = $2`,
      [user_id, event_id]
    );
    return result.rows[0] || null;
  },

  async findByEvent(event_id) {
    const result = await db.query(
      `SELECT er.*, u.name AS reviewer_name, u.email AS reviewer_email
       FROM event_reviews er
       JOIN users u ON er.user_id = u.id
       WHERE er.event_id = $1
       ORDER BY er.updated_at DESC`,
      [event_id]
    );
    return result.rows;
  },

  async avgRatingForEvent(event_id) {
    const result = await db.query(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*) AS total
       FROM event_reviews WHERE event_id = $1`,
      [event_id]
    );
    return result.rows[0];
  },
};

module.exports = EventReviewModel;

