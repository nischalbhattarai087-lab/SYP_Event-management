const db = require('../config/db');

const NotificationModel = {
  async create({ user_id, event_id, message, type }) {
    const result = await db.query(
      `INSERT INTO notifications (user_id, event_id, message, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, event_id || null, message, type || 'info']
    );
    return result.rows[0];
  },

  async findByUser(user_id) {
    const result = await db.query(
      `SELECT n.id, n.user_id, n.event_id, n.message, n.type, n.is_read,
              n.created_at, n.metadata, e.title AS event_title
       FROM notifications n
       LEFT JOIN events e ON n.event_id = e.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [user_id]
    );
    return result.rows;
  },

  async markRead(id, user_id) {
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );
    return result.rows[0];
  },

  async markAllRead(user_id) {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [user_id]);
  },

  async countUnread(user_id) {
    const result = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [user_id]
    );
    return parseInt(result.rows[0].count);
  },
};

module.exports = NotificationModel;
