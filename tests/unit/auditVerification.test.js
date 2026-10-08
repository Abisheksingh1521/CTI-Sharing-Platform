const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase, dbRun, dbGet } = require('../../src/config/database');
const AuditService = require('../../src/services/auditService');

describe('Unit Tests: Tamper-Evident SHA-256 Audit Chain Verification (CTI-109)', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();
  });

  test('Valid Audit Log Chain returns valid: true with zero tampering detected', async () => {
    // Log two valid events
    await AuditService.logEvent({
      userId: 'usr-analyst-01',
      eventType: 'TEST_EVENT_A',
      actionDetails: 'Analyst inspected triage queue'
    });

    await AuditService.logEvent({
      userId: 'usr-analyst-01',
      eventType: 'TEST_EVENT_B',
      actionDetails: 'Analyst approved indicator'
    });

    const verification = await AuditService.verifyAuditChain();
    assert.strictEqual(verification.valid, true);
    assert.ok(verification.count >= 2);
    assert.ok(verification.message.includes('Zero tampering detected'));
  });

  test('Deliberate out-of-band row tampering is detected by cryptographic hash mismatch', async () => {
    // 1. Insert a tracked event
    const logged = await AuditService.logEvent({
      userId: 'usr-contrib-01',
      eventType: 'TAMPER_TEST_EVENT',
      actionDetails: 'Original legitimate action description'
    });

    // 2. Perform out-of-band malicious SQL update tampering with action_details
    await dbRun(
      "UPDATE audit_logs SET action_details = 'MALICIOUS_ALTERATION_ATTEMPT' WHERE id = ?;",
      [logged.id]
    );

    // 3. Verify that verifyAuditChain detects this modification
    const verificationAfterTamper = await AuditService.verifyAuditChain();
    assert.strictEqual(verificationAfterTamper.valid, false, 'Tampered record MUST be flagged as invalid');
    assert.strictEqual(verificationAfterTamper.tamperedRecordId, logged.id, 'Must identify the exact tampered row');
    assert.ok(verificationAfterTamper.reason.includes('altered'));

    // 4. Restore original action_details to keep test environment clean
    await dbRun(
      "UPDATE audit_logs SET action_details = 'Original legitimate action description' WHERE id = ?;",
      [logged.id]
    );

    // 5. Verify integrity is restored
    const restoredVerification = await AuditService.verifyAuditChain();
    assert.strictEqual(restoredVerification.valid, true, 'Audit chain integrity must be restored');
  });
});
