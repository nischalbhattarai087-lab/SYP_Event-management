/**
 * EventHub — Database Setup & Seed Script
 * Run: node setup.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  const client = await pool.connect();
  console.log('Connected to PostgreSQL');

  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('Extension: uuid-ossp ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','organizer','admin')),
        avatar_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Table: users created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'General' CHECK (category IN ('Concert','Conference','Workshop','Festival','Sports','Theater','Exhibition','General')),
        event_date DATE NOT NULL,
        event_time TIME NOT NULL,
        end_time TIME,
        location VARCHAR(200) NOT NULL,
        address TEXT,
        poster_url VARCHAR(255),
        organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        total_seats INTEGER NOT NULL DEFAULT 100,
        available_seats INTEGER NOT NULL DEFAULT 100,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
        admin_feedback TEXT,
        admin_rating INTEGER CHECK (admin_rating BETWEEN 1 AND 5),
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Table: events created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','pending')),
        qr_code VARCHAR(255),
        purchased_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Table: tickets created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('ticket_confirmed','event_reminder','event_update','info')),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Table: notifications created');

    await client.query(`
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
    console.log('Table: event_reviews created');

    await client.query(`
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
    console.log('Table: conversations created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Table: messages created');

    await client.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP');
    await client.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancel_reason TEXT');
    console.log('Columns: tickets cancellation metadata ready');

    await client.query('CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_category ON events(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_event_reviews_user_event ON event_reviews(user_id, event_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant_one_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant_two_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
    console.log('Indexes created');

    // Seed admin
    var adminCheck = await client.query("SELECT id FROM users WHERE email = 'admin@eventhub.np'");
    if (adminCheck.rows.length === 0) {
      var adminHash = await bcrypt.hash('admin123', 12);
      await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
        ['Admin User', 'admin@eventhub.np', adminHash]
      );
      console.log('Admin seeded: admin@eventhub.np / admin123');
    } else {
      console.log('Admin already exists');
    }

    // Seed organizer
    var orgCheck = await client.query("SELECT id FROM users WHERE email = 'organizer@eventhub.np'");
    if (orgCheck.rows.length === 0) {
      var orgHash = await bcrypt.hash('organizer123', 12);
      var orgResult = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'organizer') RETURNING id",
        ['Demo Organizer', 'organizer@eventhub.np', orgHash]
      );
      var orgId = orgResult.rows[0].id;
      console.log('Organizer seeded: organizer@eventhub.np / organizer123');

      var events = [
        ['Kathmandu Jazz Festival 2026', 'An evening of soulful jazz with top artists from Nepal and abroad.', 'Festival', '2026-04-15', '18:00', 'Kathmandu', 'Narayanhiti Palace Museum, Kathmandu', orgId, 500, 1500],
        ['Tech Summit Nepal 2026', 'Annual conference for developers, designers, and entrepreneurs.', 'Conference', '2026-04-22', '09:00', 'Pokhara', 'Pokhara Convention Center, Lakeside', orgId, 300, 2000],
        ['React Workshop — Advanced Patterns', 'Deep dive into Hooks, Context and React Performance.', 'Workshop', '2026-05-01', '10:00', 'Lalitpur', 'Learning Hub, Jawalakhel, Lalitpur', orgId, 50, 500],
        ['Everest Marathon 2026', 'Experience the world highest marathon from Everest Base Camp.', 'Sports', '2026-05-20', '06:00', 'Solukhumbu', 'Everest Base Camp, Solukhumbu Nepal', orgId, 200, 10000],
        ['Classical Nepali Music Night', 'Enchanting evening of classical music with sarangi and madal.', 'Concert', '2026-04-30', '19:00', 'Bhaktapur', 'Bhaktapur Durbar Square, Bhaktapur', orgId, 1000, 0],
        ['Startup Pitch Competition', 'Pitch your idea to leading investors and win funding.', 'Conference', '2026-06-10', '13:00', 'Kathmandu', 'Hyatt Regency, Bouddha, Kathmandu', orgId, 150, 1200]
      ];

      for (var i = 0; i < events.length; i++) {
        var e = events[i];
        await client.query(
          'INSERT INTO events (title, description, category, event_date, event_time, location, address, organizer_id, total_seats, available_seats, price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10)',
          e
        );
      }
      console.log('6 demo events seeded');
    } else {
      console.log('Demo data already exists');
    }

    await client.query('COMMIT');
    console.log('\n--- Setup complete! ---');
    console.log('Admin:      admin@eventhub.np     / admin123');
    console.log('Organizer:  organizer@eventhub.np / organizer123');
    console.log('URL:        http://localhost:5000');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Setup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
