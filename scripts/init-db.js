require('dotenv').config();
const { initDatabase, dbAll } = require('../src/config/database');

async function main() {
  console.log('[DB-INIT] Initializing CTI Platform Relational Database...');
  try {
    await initDatabase();
    console.log('[DB-INIT] Database initialized successfully.');

    const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    console.log('[DB-INIT] Registered Tables:', tables.map(t => t.name).join(', '));

    const users = await dbAll("SELECT id, username, email, role, org_id FROM users;");
    console.log('[DB-INIT] Seeded Users:');
    users.forEach(u => console.log(`  - ${u.username} (${u.role}) -> Org: ${u.org_id}`));

    const audit = await dbAll("SELECT id, event_type, current_record_hash FROM audit_logs;");
    console.log('[DB-INIT] Audit Genesis Anchor:', audit[0]?.current_record_hash);

    process.exit(0);
  } catch (err) {
    console.error('[DB-INIT] Fatal error initializing database:', err);
    process.exit(1);
  }
}

main();
