const { dbAll } = require('../config/database');
const AuditService = require('../services/auditService');

/**
 * Audit Management Controller (CTI-109)
 * Exposes endpoints for platform administrators to review logs and verify tamper-evidence.
 */
class AuditController {
  /**
   * List audit log records (Admin-only)
   */
  static async getAuditLogs(req, res) {
    const { limit = 50, eventType } = req.query;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType.toUpperCase());
    }

    query += ' ORDER BY rowid DESC LIMIT ?;';
    params.push(Math.min(200, parseInt(limit, 10) || 50));

    try {
      const records = await dbAll(query, params);
      return res.status(200).json({
        count: records.length,
        auditLogs: records
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve audit log records'
      });
    }
  }

  /**
   * Cryptographically verify the SHA-256 hash chain across all audit records
   */
  static async verifyAuditChain(req, res) {
    try {
      const verification = await AuditService.verifyAuditChain();

      if (!verification.valid) {
        return res.status(409).json({
          status: 'TAMPER_DETECTED',
          message: 'Cryptographic hash mismatch detected in audit trail! Possible unauthorized database modification.',
          details: verification
        });
      }

      return res.status(200).json({
        status: 'VERIFIED',
        message: 'Audit trail integrity verified. All continuous SHA-256 record hashes match.',
        details: verification
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to complete audit chain verification'
      });
    }
  }
}

module.exports = AuditController;
