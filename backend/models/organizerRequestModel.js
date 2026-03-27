const db = require('../config/db');

const OrganizerRequestModel = {
  async create(user_id) {
    const result = await db.query(
      `INSERT INTO organizer_requests (user_id) VALUES ($1) RETURNING *`,
      [user_id]
    );
    return result.rows[0];
  },

  async findByUser(user_id) {
    const result = await db.query(
      `SELECT * FROM organizer_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );
    return result.rows[0];
  },

  async findPending() {
    const result = await db.query(
      `SELECT r.*, u.name AS user_name, u.email AS user_email
       FROM organizer_requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC`
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      `SELECT r.*, u.name AS user_name, u.email AS user_email
       FROM organizer_requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async resolve(id, status, resolved_by) {
    const result = await db.query(
      `UPDATE organizer_requests
       SET status = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, resolved_by, id]
    );
    return result.rows[0];
  },
};

module.exports = OrganizerRequestModel;
