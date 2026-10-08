const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Determine database path
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/cti_platform.sqlite');

// Ensure parent data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Promisified database helpers to guarantee parameterized execution
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Initialize database schema and enforce security pragmas
async function initDatabase() {
  // Enforce WAL mode and Foreign Key constraints
  await dbRun('PRAGMA foreign_keys = ON;');
  await dbRun('PRAGMA journal_mode = WAL;');

  // 1. Organizations Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      trust_level TEXT NOT NULL CHECK(trust_level IN ('VERIFIED', 'STANDARD', 'PROBATIONARY')) DEFAULT 'STANDARD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Users Table (Bcrypt password hash, MFA secret, RBAC role)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ROLE_ADMIN', 'ROLE_ANALYST', 'ROLE_CONTRIBUTOR', 'ROLE_CONSUMER')),
      mfa_secret TEXT NOT NULL,
      mfa_enabled INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT
    );
  `);

  // 3. Threat Reports Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS threat_reports (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      tlp_level TEXT NOT NULL CHECK(tlp_level IN ('CLEAR', 'GREEN', 'AMBER', 'RED')) DEFAULT 'AMBER',
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // 4. Threat Indicators Table (IoCs)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS threat_indicators (
      id TEXT PRIMARY KEY,
      report_id TEXT,
      org_id TEXT NOT NULL,
      submitter_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('IPV4', 'IPV6', 'DOMAIN', 'MD5', 'SHA1', 'SHA256')),
      value TEXT NOT NULL,
      value_defanged TEXT NOT NULL,
      description TEXT,
      tlp_level TEXT NOT NULL CHECK(tlp_level IN ('CLEAR', 'GREEN', 'AMBER', 'RED')) DEFAULT 'AMBER',
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
      confidence_score INTEGER NOT NULL CHECK(confidence_score BETWEEN 0 AND 100) DEFAULT 50,
      mitre_attack_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES threat_reports(id) ON DELETE SET NULL,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
      FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // 5. Review Logs Table (Analyst Triage Decisions)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      indicator_id TEXT NOT NULL,
      analyst_id TEXT NOT NULL,
      decision TEXT NOT NULL CHECK(decision IN ('APPROVED', 'REJECTED')),
      assigned_tlp TEXT NOT NULL CHECK(assigned_tlp IN ('CLEAR', 'GREEN', 'AMBER', 'RED')),
      justification TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (indicator_id) REFERENCES threat_indicators(id) ON DELETE CASCADE,
      FOREIGN KEY (analyst_id) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // 6. Audit Logs Table (Tamper-Evident SHA-256 Hash Chained Audit Log)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      resource_id TEXT,
      action_details TEXT NOT NULL,
      prev_record_hash TEXT NOT NULL,
      current_record_hash TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Create Indexes for High Performance and Filtering
  await dbRun('CREATE INDEX IF NOT EXISTS idx_indicators_status ON threat_indicators(status);');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_indicators_tlp ON threat_indicators(tlp_level);');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_indicators_type ON threat_indicators(type);');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);');

  // Seed Initial Organizations and Users if empty
  await seedInitialData();
}

async function seedInitialData() {
  const orgCount = await dbGet('SELECT COUNT(*) as count FROM organizations;');
  if (orgCount.count === 0) {
    // Seed Organizations
    await dbRun(
      'INSERT INTO organizations (id, name, domain, trust_level) VALUES (?, ?, ?, ?);',
      ['org-cert-in', 'National CERT Coordination Center', 'cert-in.org.in', 'VERIFIED']
    );
    await dbRun(
      'INSERT INTO organizations (id, name, domain, trust_level) VALUES (?, ?, ?, ?);',
      ['org-cyber-defense', 'Cyber Defense Corp', 'cyberdefense.local', 'VERIFIED']
    );

    // Standard salt rounds (10 rounds per security requirements)
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);
    const deterministicMfaSecret = 'JBSWY3DPEHPK3PXP'; // Base32 test secret for RFC 6238 TOTP

    // Seed Users (1 Admin, 1 Analyst, 1 Contributor, 1 Consumer)
    await dbRun(
      `INSERT INTO users (id, org_id, username, email, password_hash, role, mfa_secret, mfa_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      ['usr-admin-01', 'org-cert-in', 'admin_sec', 'admin@cti.local', defaultPasswordHash, 'ROLE_ADMIN', deterministicMfaSecret, 1]
    );

    await dbRun(
      `INSERT INTO users (id, org_id, username, email, password_hash, role, mfa_secret, mfa_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      ['usr-analyst-01', 'org-cert-in', 'analyst_riya', 'analyst@cti.local', defaultPasswordHash, 'ROLE_ANALYST', deterministicMfaSecret, 1]
    );

    await dbRun(
      `INSERT INTO users (id, org_id, username, email, password_hash, role, mfa_secret, mfa_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      ['usr-contrib-01', 'org-cyber-defense', 'contributor_alex', 'contributor@corp.local', defaultPasswordHash, 'ROLE_CONTRIBUTOR', deterministicMfaSecret, 1]
    );

    await dbRun(
      `INSERT INTO users (id, org_id, username, email, password_hash, role, mfa_secret, mfa_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      ['usr-consumer-01', 'org-cyber-defense', 'consumer_siem', 'consumer@siem.local', defaultPasswordHash, 'ROLE_CONSUMER', deterministicMfaSecret, 1]
    );

    // Seed Genesis Audit Record
    const crypto = require('crypto');
    const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const initPayload = `${genesisHash}|SYSTEM|SYSTEM_INIT|Platform database initialized with genesis anchor`;
    const initHash = crypto.createHash('sha256').update(initPayload).digest('hex');

    await dbRun(
      `INSERT INTO audit_logs (id, user_id, event_type, ip_address, resource_id, action_details, prev_record_hash, current_record_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      ['audit-genesis', null, 'SYSTEM_INIT', '127.0.0.1', 'DATABASE', 'Platform database initialized with genesis anchor', genesisHash, initHash]
    );
  }
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDatabase
};
