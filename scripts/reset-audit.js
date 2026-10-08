require('dotenv').config();
const { dbRun } = require('../src/config/database');

async function reset() {
  await dbRun("DELETE FROM audit_logs WHERE id != 'audit-genesis';");
  console.log('[AUDIT-RESET] Audit log reset to genesis anchor.');
  process.exit(0);
}
reset();
