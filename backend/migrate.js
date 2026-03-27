require('dotenv').config();
const db = require('./config/db');

async function migrate() {
  console.log('Running organizer request migrations...');

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
  console.log('+ organizer_requests table ready');

  await db.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB');
  console.log('+ notifications.metadata column ready');

  await db.query('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
  await db.query(`
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('ticket_confirmed','event_reminder','event_update','info','organizer_request'))
  `);
  console.log('+ notifications type constraint updated');

  console.log('\nAll migrations applied successfully!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
