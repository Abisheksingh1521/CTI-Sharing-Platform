const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { getTOTPCode, verifyTOTP, base32Decode } = require('../../src/services/totpService');
const AuditService = require('../../src/services/auditService');

describe('Unit Tests: Authentication & Cryptographic Services (CTI-101, CTI-109)', () => {
  const testSecret = 'JBSWY3DPEHPK3PXP'; // Base32 test secret

  test('bcrypt salted password hashing creates valid hash and matches', async () => {
    const password = 'SuperSecurePassword2026!';
    const hash = await bcrypt.hash(password, 10);

    assert.ok(hash.startsWith('$2a$10$') || hash.startsWith('$2b$10$'), 'Hash must use cost factor 10');
    assert.notStrictEqual(password, hash, 'Password must not be stored in plaintext');

    const isMatch = await bcrypt.compare(password, hash);
    assert.strictEqual(isMatch, true, 'Correct password must match hash');

    const isBadMatch = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isBadMatch, false, 'Incorrect password must be rejected');
  });

  test('TOTP generates 6-digit numeric string for Base32 secret', () => {
    const code = getTOTPCode(testSecret);
    assert.strictEqual(typeof code, 'string');
    assert.strictEqual(code.length, 6, 'TOTP code must be 6 digits');
    assert.match(code, /^[0-9]{6}$/, 'TOTP code must consist of digits only');
  });

  test('verifyTOTP accepts valid code and rejects invalid code', () => {
    const currentCode = getTOTPCode(testSecret);
    const isValid = verifyTOTP(currentCode, testSecret);
    assert.strictEqual(isValid, true, 'Current valid code must pass verification');

    const isBadValid = verifyTOTP('000000', testSecret);
    assert.strictEqual(isBadValid, false, 'Arbitrary false code must fail verification');
  });

  test('verifyTOTP handles +/- 30s clock drift window', () => {
    const now = Date.now();
    const pastCode = getTOTPCode(testSecret, now - 30000); // 30s ago
    const isValidPast = verifyTOTP(pastCode, testSecret, now);
    assert.strictEqual(isValidPast, true, 'Code from 30 seconds ago must be accepted under clock drift window');
  });

  test('AuditService computes consistent SHA-256 hash chains', () => {
    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const hash1 = AuditService.computeRecordHash(prevHash, 'usr-1', 'LOGIN', 'Success', '2026-10-08T10:00:00Z');
    const hash2 = AuditService.computeRecordHash(prevHash, 'usr-1', 'LOGIN', 'Success', '2026-10-08T10:00:00Z');
    const hashAltered = AuditService.computeRecordHash(prevHash, 'usr-1', 'LOGIN', 'TAMPERED', '2026-10-08T10:00:00Z');

    assert.strictEqual(hash1, hash2, 'Hash must be deterministic for identical payloads');
    assert.notStrictEqual(hash1, hashAltered, 'Altered content must yield a completely different SHA-256 hash');
  });
});
