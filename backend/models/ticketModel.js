const db = require('../config/db');

const TicketModel = {
  async create({ user_id, event_id, quantity, total_price, qr_code }) {
    const result = await db.query(
      `INSERT INTO tickets (user_id, event_id, quantity, total_price, qr_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, event_id, quantity, total_price, qr_code]
    );
    return result.rows[0];
  },

  async findByUser(user_id) {
    const result = await db.query(
      `SELECT t.*, e.title AS event_title, e.event_date, e.event_time, e.location, e.poster_url, e.category
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.user_id = $1
       ORDER BY t.purchased_at DESC`,
      [user_id]
    );
    return result.rows;
  },

  async existsByUserAndEvent(user_id, event_id) {
    const result = await db.query(
      `SELECT 1
       FROM tickets
       WHERE user_id = $1 AND event_id = $2
       LIMIT 1`,
      [user_id, event_id]
    );
    return result.rows.length > 0;
  },

  async findById(id) {
    const result = await db.query(
      `SELECT t.*, e.title AS event_title, e.event_date, e.event_time, e.location, u.name AS user_name
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async count() {
    const result = await db.query('SELECT COUNT(*) FROM tickets');
    return parseInt(result.rows[0].count);
  },

  async totalRevenue() {
    const result = await db.query('SELECT COALESCE(SUM(total_price), 0) AS revenue FROM tickets WHERE status = $1', ['confirmed']);
    return parseFloat(result.rows[0].revenue);
  },
};

module.exports = TicketModel;
