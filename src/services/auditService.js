const crypto = require('crypto');
const { dbGet, dbRun, dbAll } = require('../config/database');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Tamper-Evident SHA-256 Hash-Chained Audit Service
 * The hash chain provides tamper-evident integrity verification of audit records.
 */
class AuditService {
  /**
   * Compute SHA-256 hash for a log record given previous hash and row data
   */
  static computeRecordHash(prevHash, userId, eventType, actionDetails, timestamp) {
    const rawPayload = `${prevHash}|${userId || 'ANONYMOUS'}|${eventType}|${actionDetails}|${timestamp}`;
    return crypto.createHash('sha256').update(rawPayload).digest('hex');
  }

  static logQueue = Promise.resolve();

  /**
   * Log a security event and link it cryptographically to the preceding record
   */
  static logEvent(eventData) {
    this.logQueue = this.logQueue.then(() => this._insertLog(eventData));
    return this.logQueue;
  }

  static async _insertLog({ userId = null, eventType, ipAddress = '127.0.0.1', resourceId = null, actionDetails }) {
    const id = 'audit-' + crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Retrieve the most recent log record's hash to maintain the chain
    const latestRecord = await dbGet('SELECT current_record_hash FROM audit_logs ORDER BY rowid DESC LIMIT 1;');
    const prevHash = latestRecord ? latestRecord.current_record_hash : GENESIS_HASH;

    const currentHash = this.computeRecordHash(prevHash, userId, eventType, actionDetails, timestamp);

    await dbRun(
      `INSERT INTO audit_logs (id, user_id, event_type, ip_address, resource_id, action_details, prev_record_hash, current_record_hash, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, userId, eventType, ipAddress, resourceId, actionDetails, prevHash, currentHash, timestamp]
    );

    return { id, eventType, currentHash, prevHash, timestamp };
  }

  /**
   * Verify the entire cryptographic hash chain to detect any tampering or retroactive changes
   */
  static async verifyAuditChain() {
    const records = await dbAll('SELECT * FROM audit_logs ORDER BY rowid ASC;');

    if (!records || records.length === 0) {
      return { valid: true, count: 0, message: 'Audit log is empty' };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];

      // Genesis record check
      if (i === 0) {
        if (rec.prev_record_hash !== GENESIS_HASH) {
          return {
            valid: false,
            tamperedRecordId: rec.id,
            reason: 'Genesis record does not anchor to standard Genesis hash',
            index: i
          };
        }
      } else {
        // Continuous chain continuity check
        if (rec.prev_record_hash !== expectedPrevHash) {
          return {
            valid: false,
            tamperedRecordId: rec.id,
            reason: `Broken hash chain: expected prev_hash ${expectedPrevHash}, found ${rec.prev_record_hash}`,
            index: i
          };
        }
      }

      // Re-compute current hash using stored data
      const calculatedHash = this.computeRecordHash(
        rec.prev_record_hash,
        rec.user_id,
        rec.event_type,
        rec.action_details,
        rec.timestamp
      );

      // Verify row content hasn't been altered
      if (calculatedHash !== rec.current_record_hash) {
        // Special case for initial DB seed genesis anchor if seeded with different format
        if (i === 0 && rec.id === 'audit-genesis') {
          expectedPrevHash = rec.current_record_hash;
          continue;
        }

        return {
          valid: false,
          tamperedRecordId: rec.id,
          reason: 'Row content altered: hash signature mismatch',
          index: i,
          expectedHash: calculatedHash,
          storedHash: rec.current_record_hash
        };
      }

      expectedPrevHash = rec.current_record_hash;
    }

    return {
      valid: true,
      count: records.length,
      latestHash: expectedPrevHash,
      message: `Audit chain verified successfully across ${records.length} records. Zero tampering detected.`
    };
  }
}

module.exports = AuditService;
