const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const organizerRequestRoutes = require('./routes/organizerRequestRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// ─── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (poster uploads) ────────────────────────
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/organizer-requests', organizerRequestRoutes);
app.use('/api/chat', chatRoutes);

// ─── Health check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'EventHub API is running 🚀', timestamp: new Date().toISOString() });
});

// ─── 404 handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found.` });
});

// ─── Global error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max size is 5MB.' });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const ensureEventReviewColumns = async () => {
  await db.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending'");
  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS admin_feedback TEXT');
  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS admin_rating INTEGER');
  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_by UUID');
  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP');
  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIME');
  await db.query("UPDATE events SET review_status = 'approved' WHERE is_active = TRUE AND review_status IS NULL");
  await db.query("UPDATE events SET review_status = 'pending' WHERE is_active = FALSE AND review_status IS NULL");
};

const ensureUserEventReviewsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS event_reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      feedback TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, event_id)
    )
  `);
};

const ensureOrganizerRequestsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS organizer_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
      resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Add metadata column to notifications for storing organizer request info
  await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB`);
  // Add organizer_request type if not in constraint (safe to re-run)
  await db.query(`
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check
  `);
  await db.query(`
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('ticket_confirmed','event_reminder','event_update','info','organizer_request'))
  `);
};

const ensureTicketCancelColumns = async () => {
  await db.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP');
  await db.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancel_reason TEXT');
};

const ensureChatTables = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      participant_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      participant_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CHECK (participant_one_id <> participant_two_id),
      UNIQUE (participant_one_id, participant_two_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant_one_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant_two_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
};

const start = async () => {
  try {
    await ensureEventReviewColumns();
    await ensureUserEventReviewsTable();
    await ensureOrganizerRequestsTable();
    await ensureTicketCancelColumns();
    await ensureChatTables();
    app.listen(PORT, () => {
      console.log(`🚀 EventHub server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize server schema:', err.message);
    process.exit(1);
  }
};

start();

module.exports = app;
