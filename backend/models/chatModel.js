const db = require('../config/db');

const ChatModel = {
  normalizePair(userA, userB) {
    return userA < userB ? [userA, userB] : [userB, userA];
  },

  async findUserById(id) {
    const result = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findAllowedContacts(currentUser) {
    if (currentUser.role === 'user') {
      // users can chat with organizers and admins
      const result = await db.query(
        "SELECT id, name, email, role FROM users WHERE role IN ('organizer', 'admin') AND id <> $1 ORDER BY role ASC, name ASC",
        [currentUser.id]
      );
      return result.rows;
    }

    if (currentUser.role === 'organizer') {
      // organizers can chat with users and admins
      const result = await db.query(
        "SELECT id, name, email, role FROM users WHERE role IN ('user', 'admin') AND id <> $1 ORDER BY role ASC, name ASC",
        [currentUser.id]
      );
      return result.rows;
    }

    if (currentUser.role === 'admin') {
      // admin can chat with everyone
      const result = await db.query(
        "SELECT id, name, email, role FROM users WHERE role IN ('user', 'organizer') AND id <> $1 ORDER BY role ASC, name ASC",
        [currentUser.id]
      );
      return result.rows;
    }

    return [];
  },

  async getConversationByParticipants(userA, userB) {
    const [p1, p2] = this.normalizePair(userA, userB);
    const result = await db.query(
      `SELECT * FROM conversations
       WHERE participant_one_id = $1 AND participant_two_id = $2`,
      [p1, p2]
    );
    return result.rows[0] || null;
  },

  async getOrCreateConversation(userA, userB) {
    const [p1, p2] = this.normalizePair(userA, userB);
    const result = await db.query(
      `INSERT INTO conversations (participant_one_id, participant_two_id)
       VALUES ($1, $2)
       ON CONFLICT (participant_one_id, participant_two_id)
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [p1, p2]
    );
    return result.rows[0];
  },

  async listMyConversations(userId) {
    const result = await db.query(
      `SELECT c.id, c.participant_one_id, c.participant_two_id, c.updated_at, c.created_at,
              CASE
                WHEN c.participant_one_id = $1 THEN u2.id
                ELSE u1.id
              END AS other_user_id,
              CASE
                WHEN c.participant_one_id = $1 THEN u2.name
                ELSE u1.name
              END AS other_user_name,
              CASE
                WHEN c.participant_one_id = $1 THEN u2.role
                ELSE u1.role
              END AS other_user_role,
              lm.message AS last_message,
              lm.created_at AS last_message_at
       FROM conversations c
       JOIN users u1 ON u1.id = c.participant_one_id
       JOIN users u2 ON u2.id = c.participant_two_id
       LEFT JOIN LATERAL (
         SELECT m.message, m.created_at
         FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC
         LIMIT 1
       ) lm ON TRUE
       WHERE c.participant_one_id = $1 OR c.participant_two_id = $1
       ORDER BY COALESCE(lm.created_at, c.updated_at) DESC`,
      [userId]
    );
    return result.rows;
  },

  async findConversationForUser(conversationId, userId) {
    const result = await db.query(
      `SELECT * FROM conversations
       WHERE id = $1 AND (participant_one_id = $2 OR participant_two_id = $2)`,
      [conversationId, userId]
    );
    return result.rows[0] || null;
  },

  async listMessages(conversationId, limit = 100, offset = 0) {
    const result = await db.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.message, m.created_at,
              u.name AS sender_name, u.role AS sender_role
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return result.rows;
  },

  async createMessage(conversationId, senderId, message) {
    const insert = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, senderId, message]
    );
    await db.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
    return insert.rows[0];
  },
};

module.exports = ChatModel;
