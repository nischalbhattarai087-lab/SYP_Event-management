const db = require('../config/db');

const EventModel = {
  async findAll({ category, date_from, date_to, location, search, limit = 12, offset = 0 }) {
    let conditions = ['e.is_active = TRUE'];
    let params = [];
    let idx = 1;

    if (category) { conditions.push(`e.category = $${idx++}`); params.push(category); }
    if (date_from) { conditions.push(`e.event_date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`e.event_date <= $${idx++}`); params.push(date_to); }
    if (location) { conditions.push(`LOWER(e.location) LIKE $${idx++}`); params.push(`%${location.toLowerCase()}%`); }
    if (search) { conditions.push(`(LOWER(e.title) LIKE $${idx++} OR LOWER(e.description) LIKE $${idx++})`); params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await db.query(
      `SELECT e.*, u.name AS organizer_name FROM events e
       LEFT JOIN users u ON e.organizer_id = u.id
       ${where}
       ORDER BY e.event_date ASC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    return result.rows;
  },

  async countAll({ category, date_from, date_to, location, search }) {
    let conditions = ['is_active = TRUE'];
    let params = [];
    let idx = 1;

    if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
    if (date_from) { conditions.push(`event_date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`event_date <= $${idx++}`); params.push(date_to); }
    if (location) { conditions.push(`LOWER(location) LIKE $${idx++}`); params.push(`%${location.toLowerCase()}%`); }
    if (search) { conditions.push(`(LOWER(title) LIKE $${idx++} OR LOWER(description) LIKE $${idx++})`); params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(`SELECT COUNT(*) FROM events ${where}`, params);
    return parseInt(result.rows[0].count);
  },

  async findById(id) {
    const result = await db.query(
      `SELECT e.*, u.name AS organizer_name, u.email AS organizer_email
       FROM events e LEFT JOIN users u ON e.organizer_id = u.id
       WHERE e.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByOrganizer(organizer_id) {
    const result = await db.query(
      'SELECT * FROM events WHERE organizer_id = $1 ORDER BY created_at DESC',
      [organizer_id]
    );
    return result.rows;
  },

  async create({ title, description, category, event_date, event_time, end_time, location, address, poster_url, organizer_id, total_seats, price, is_active = true, review_status = 'pending' }) {
    const result = await db.query(
      `INSERT INTO events (title, description, category, event_date, event_time, end_time, location, address, poster_url, organizer_id, total_seats, available_seats, price, is_active, review_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,$14) RETURNING *`,
      [title, description, category, event_date, event_time, end_time, location, address, poster_url, organizer_id, total_seats, price, is_active, review_status]
    );
    return result.rows[0];
  },

  async update(id, fields) {
    const allowed = ['title', 'description', 'category', 'event_date', 'event_time', 'end_time', 'location', 'address', 'poster_url', 'total_seats', 'price', 'is_active', 'review_status', 'admin_feedback', 'reviewed_by', 'reviewed_at', 'admin_rating'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        params.push(fields[key]);
      }
    }
    if (!updates.length) return null;
    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await db.query(
      `UPDATE events SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return result.rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM events WHERE id = $1', [id]);
  },

  async decrementSeats(id, quantity) {
    const result = await db.query(
      `UPDATE events SET available_seats = available_seats - $1, updated_at = NOW()
       WHERE id = $2 AND available_seats >= $1 RETURNING available_seats`,
      [quantity, id]
    );
    return result.rows[0];
  },

  async count() {
    const result = await db.query('SELECT COUNT(*) FROM events');
    return parseInt(result.rows[0].count);
  },
};

module.exports = EventModel;
