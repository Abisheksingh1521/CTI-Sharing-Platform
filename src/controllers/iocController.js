const crypto = require('crypto');
const { dbGet, dbRun, dbAll } = require('../config/database');
const iocValidator = require('../services/iocValidator');
const AuditService = require('../services/auditService');

/**
 * IoC Ingestion & Management Controller (CTI-103, CTI-104)
 */
class IoCController {
  /**
   * Ingest a new Threat Indicator (IPv4, IPv6, Domain, Hash)
   */
  static async submitIoC(req, res) {
    const { type, value, description = '', tlp = 'AMBER', reportId = null, confidence = 50, mitreAttackId = null } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!type || !value) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Observable type and value are required'
      });
    }

    // Validate TLP enum
    const validTlps = ['CLEAR', 'GREEN', 'AMBER', 'RED'];
    const normalizedTlp = (tlp || 'AMBER').toUpperCase();
    if (!validTlps.includes(normalizedTlp)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid TLP level. Must be one of: [${validTlps.join(', ')}]`
      });
    }

    // Execute Strategy Pattern Validation and Defanging
    let processed;
    try {
      processed = iocValidator.process(type, value);
    } catch (strategyErr) {
      return res.status(400).json({
        error: 'Bad Request',
        message: strategyErr.message
      });
    }

    if (!processed.isValid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: processed.error
      });
    }

    try {
      // If reportId provided, verify report exists
      if (reportId) {
        const report = await dbGet('SELECT id FROM threat_reports WHERE id = ?;', [reportId]);
        if (!report) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Referenced Threat Report with ID '${reportId}' does not exist`
          });
        }
      }

      // De-duplication Check: Check if this observable already exists in the system
      const existing = await dbGet(
        'SELECT id, status, tlp_level, created_at FROM threat_indicators WHERE type = ? AND value = ?;',
        [processed.type, processed.normalizedValue]
      );

      if (existing) {
        await AuditService.logEvent({
          userId: req.user.id,
          eventType: 'IOC_DUPLICATE_SIGHTING',
          ipAddress: clientIp,
          resourceId: existing.id,
          actionDetails: `Duplicate observable sighting submitted for '${processed.defangedValue}'`
        });

        return res.status(200).json({
          message: 'Indicator already cataloged in platform. Duplicate sighting recorded.',
          isDuplicate: true,
          indicatorId: existing.id,
          status: existing.status,
          tlp: existing.tlp_level
        });
      }

      // Insert new indicator with PENDING status
      const indicatorId = 'ioc-' + crypto.randomUUID();
      const sanitizedDescription = (description || '').replace(/<[^>]*>?/gm, ''); // Strip HTML tags

      await dbRun(
        `INSERT INTO threat_indicators (
          id, report_id, org_id, submitter_id, type, value, value_defanged,
          description, tlp_level, status, confidence_score, mitre_attack_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?);`,
        [
          indicatorId,
          reportId,
          req.user.orgId,
          req.user.id,
          processed.type,
          processed.normalizedValue,
          processed.defangedValue,
          sanitizedDescription,
          normalizedTlp,
          Math.min(100, Math.max(0, parseInt(confidence, 10) || 50)),
          mitreAttackId ? mitreAttackId.trim().toUpperCase() : null
        ]
      );

      // Record Audit Event
      await AuditService.logEvent({
        userId: req.user.id,
        eventType: 'IOC_SUBMITTED',
        ipAddress: clientIp,
        resourceId: indicatorId,
        actionDetails: `Indicator '${processed.defangedValue}' (${processed.type}, TLP:${normalizedTlp}) submitted by '${req.user.username}'`
      });

      return res.status(201).json({
        message: 'Threat indicator ingested successfully. Queued for analyst triage.',
        indicator: {
          id: indicatorId,
          type: processed.type,
          defangedValue: processed.defangedValue,
          tlp: normalizedTlp,
          status: 'PENDING',
          submitterOrg: req.user.orgId,
          createdAt: new Date().toISOString()
        }
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to ingest threat indicator'
      });
    }
  }

  /**
   * Query Indicators with filters
   */
  static async getIoCs(req, res) {
    const { status, type, tlp, limit = 50 } = req.query;

    let query = `
      SELECT i.id, i.type, i.value_defanged as value, i.description, i.tlp_level,
             i.status, i.confidence_score, i.mitre_attack_id, i.created_at,
             o.name as submitter_org, u.username as submitter_user
      FROM threat_indicators i
      JOIN organizations o ON i.org_id = o.id
      JOIN users u ON i.submitter_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status.toUpperCase());
    }

    if (type) {
      query += ' AND i.type = ?';
      params.push(type.toUpperCase());
    }

    if (tlp) {
      query += ' AND i.tlp_level = ?';
      params.push(tlp.toUpperCase());
    }

    query += ' ORDER BY i.created_at DESC LIMIT ?;';
    params.push(Math.min(200, parseInt(limit, 10) || 50));

    try {
      const indicators = await dbAll(query, params);
      return res.status(200).json({
        count: indicators.length,
        indicators
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to query threat indicators'
      });
    }
  }

  /**
   * Get single indicator by ID
   */
  static async getIoCById(req, res) {
    const { id } = req.params;

    try {
      const indicator = await dbGet(
        `SELECT i.*, o.name as submitter_org, u.username as submitter_user
         FROM threat_indicators i
         JOIN organizations o ON i.org_id = o.id
         JOIN users u ON i.submitter_id = u.id
         WHERE i.id = ?;`,
        [id]
      );

      if (!indicator) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Indicator '${id}' not found`
        });
      }

      return res.status(200).json({ indicator });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve indicator details'
      });
    }
  }
}

module.exports = IoCController;
