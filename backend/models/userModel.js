const db = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query('SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create({ name, email, password_hash, role = 'user' }) {
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, password_hash, role]
    );
    return result.rows[0];
  },

  async updateRole(id, role) {
    const result = await db.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );
    return result.rows[0];
  },

  async getAll({ limit = 20, offset = 0 }) {
    const result = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  },

  async count() {
    const result = await db.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count);
  },
};

module.exports = UserModel;
