require('dotenv').config();
const { initDatabase } = require('../src/config/database');
const AuditService = require('../src/services/auditService');

async function main() {
  console.log('================================================================');
  console.log('  CTI PLATFORM: TAMPER-EVIDENT SHA-256 AUDIT LOG VERIFICATION  ');
  console.log('================================================================');

  try {
    await initDatabase();
    const result = await AuditService.verifyAuditChain();

    if (result.valid) {
      console.log('\n[PASS] AUDIT TRAIL INTEGRITY CONFIRMED');
      console.log(`- Total Records Verified: ${result.count}`);
      console.log(`- Latest Hash Anchor:     ${result.latestHash}`);
      console.log(`- Status:                 ${result.message}`);
      process.exit(0);
    } else {
      console.error('\n[FAIL] TAMPERING DETECTED IN AUDIT TRAIL!');
      console.error(`- Tampered Record ID:     ${result.tamperedRecordId}`);
      console.error(`- Failure Reason:         ${result.reason}`);
      console.error(`- Expected Hash:          ${result.expectedHash}`);
      console.error(`- Stored Hash:            ${result.storedHash}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('[ERROR] Failed to verify audit chain:', err);
    process.exit(1);
  }
}

main();
