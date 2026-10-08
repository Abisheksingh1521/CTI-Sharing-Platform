const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase, dbGet, dbAll, dbRun } = require('../../src/config/database');

describe('Database Schema & Relational Integrity (Phase 4 Validation)', () => {
  before(async () => {
    await initDatabase();
  });

  test('Database enforces foreign keys and WAL mode', async () => {
    const fkPragma = await dbGet('PRAGMA foreign_keys;');
    assert.strictEqual(fkPragma.foreign_keys, 1, 'Foreign keys MUST be enabled');

    const journalPragma = await dbGet('PRAGMA journal_mode;');
    assert.strictEqual(journalPragma.journal_mode.toLowerCase(), 'wal', 'Journal mode MUST be WAL');
  });

  test('All 6 relational tables exist in sqlite_master', async () => {
    const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = tables.map(t => t.name);

    const expectedTables = [
      'organizations',
      'users',
      'threat_reports',
      'threat_indicators',
      'review_logs',
      'audit_logs'
    ];

    expectedTables.forEach(expected => {
      assert.ok(tableNames.includes(expected), `Table ${expected} must exist`);
    });
  });

  test('Foreign key constraints reject invalid organization reference', async () => {
    await assert.rejects(
      async () => {
        await dbRun(
          `INSERT INTO users (id, org_id, username, email, password_hash, role, mfa_secret)
           VALUES ('bad-user-id', 'non-existent-org', 'hacker', 'hacker@bad.org', 'fakehash', 'ROLE_CONTRIBUTOR', 'SECRET');`
        );
      },
      /FOREIGN KEY constraint failed/i,
      'Inserting user with non-existent org_id MUST trigger a foreign key violation'
    );
  });

  test('Check constraint rejects invalid TLP levels', async () => {
    await assert.rejects(
      async () => {
        await dbRun(
          `INSERT INTO threat_indicators (id, org_id, submitter_id, type, value, value_defanged, tlp_level)
           VALUES ('ioc-fail', 'org-cert-in', 'usr-analyst-01', 'IPV4', '1.1.1.1', '1[.]1[.]1[.]1', 'ULTRA_SECRET');`
        );
      },
      /CHECK constraint failed/i,
      'Inserting an indicator with an unsupported TLP level MUST trigger a CHECK constraint error'
    );
  });

  test('Audit log stores genesis block with valid SHA-256 hash', async () => {
    const genesis = await dbGet("SELECT * FROM audit_logs WHERE id = 'audit-genesis';");
    assert.ok(genesis, 'Genesis audit log must exist');
    assert.strictEqual(genesis.prev_record_hash, '0000000000000000000000000000000000000000000000000000000000000000');
    assert.strictEqual(genesis.current_record_hash.length, 64, 'SHA-256 hash length must be 64 hexadecimal characters');
  });
});
