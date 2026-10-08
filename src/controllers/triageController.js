const crypto = require('crypto');
const { dbGet, dbRun, dbAll } = require('../config/database');
const AuditService = require('../services/auditService');

/**
 * Analyst Triage Workbench Controller (CTI-106, CTI-107)
 */
class TriageController {
  /**
   * Fetch indicators currently in PENDING state awaiting analyst review
   */
  static async getPendingQueue(req, res) {
    try {
      const pendingIoCs = await dbAll(`
        SELECT i.id, i.type, i.value_defanged as value, i.description,
               i.tlp_level, i.confidence_score, i.mitre_attack_id, i.created_at,
               o.name as submitter_org, o.trust_level as org_trust_level,
               u.username as submitter_user
        FROM threat_indicators i
        JOIN organizations o ON i.org_id = o.id
        JOIN users u ON i.submitter_id = u.id
        WHERE i.status = 'PENDING'
        ORDER BY i.created_at ASC;
      `);

      return res.status(200).json({
        count: pendingIoCs.length,
        pendingIndicators: pendingIoCs
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve triage queue'
      });
    }
  }

  /**
   * Triage an indicator: Approve or Reject with justification and TLP rating
   */
  static async triageIoC(req, res) {
    const { id } = req.params;
    const { decision, assignedTlp, confidenceScore, mitreAttackId, justification } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    // Validate decision
    const validDecisions = ['APPROVED', 'REJECTED'];
    const normDecision = (decision || '').toUpperCase();
    if (!validDecisions.includes(normDecision)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: "Decision must be either 'APPROVED' or 'REJECTED'"
      });
    }

    // Validate mandatory justification
    if (!justification || justification.trim().length < 5) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A detailed analyst justification (at least 5 characters) is required'
      });
    }

    // Validate TLP assignment
    const validTlps = ['CLEAR', 'GREEN', 'AMBER', 'RED'];
    const normTlp = (assignedTlp || 'AMBER').toUpperCase();
    if (!validTlps.includes(normTlp)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Assigned TLP must be one of: [${validTlps.join(', ')}]`
      });
    }

    try {
      // Check indicator exists and is in PENDING state
      const indicator = await dbGet('SELECT * FROM threat_indicators WHERE id = ?;', [id]);
      if (!indicator) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Indicator '${id}' not found`
        });
      }

      // Calculate confidence score (0 - 100)
      const validatedScore = confidenceScore !== undefined
        ? Math.min(100, Math.max(0, parseInt(confidenceScore, 10)))
        : indicator.confidence_score;

      const sanitizedMitre = mitreAttackId ? mitreAttackId.trim().toUpperCase() : indicator.mitre_attack_id;
      const sanitizedJustification = justification.trim();

      // Update indicator record
      await dbRun(
        `UPDATE threat_indicators
         SET status = ?, tlp_level = ?, confidence_score = ?, mitre_attack_id = ?
         WHERE id = ?;`,
        [normDecision, normTlp, validatedScore, sanitizedMitre, id]
      );

      // Record immutable review decision in review_logs table
      const reviewLogId = 'rev-' + crypto.randomUUID();
      await dbRun(
        `INSERT INTO review_logs (id, indicator_id, analyst_id, decision, assigned_tlp, justification)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [reviewLogId, id, req.user.id, normDecision, normTlp, sanitizedJustification]
      );

      // Record Audit Log
      await AuditService.logEvent({
        userId: req.user.id,
        eventType: normDecision === 'APPROVED' ? 'IOC_TRIAGE_APPROVED' : 'IOC_TRIAGE_REJECTED',
        ipAddress: clientIp,
        resourceId: id,
        actionDetails: `Analyst '${req.user.username}' marked '${indicator.value_defanged}' as ${normDecision} (TLP:${normTlp}, Score:${validatedScore}). Justification: ${sanitizedJustification}`
      });

      return res.status(200).json({
        message: `Indicator successfully ${normDecision.toLowerCase()} by analyst`,
        triageResult: {
          indicatorId: id,
          decision: normDecision,
          assignedTlp: normTlp,
          confidenceScore: validatedScore,
          mitreAttackId: sanitizedMitre,
          analyst: req.user.username,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to record triage decision'
      });
    }
  }
}

module.exports = TriageController;
