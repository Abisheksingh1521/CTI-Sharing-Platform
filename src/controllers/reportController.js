const crypto = require('crypto');
const { dbGet, dbRun, dbAll } = require('../config/database');
const AuditService = require('../services/auditService');
const SanitizerService = require('../services/sanitizerService');
const { canAccessTLP } = require('../middleware/tlpGuard');

/**
 * Threat Report Submission & Management Controller (CTI-105)
 * Hardened in Phase 12 (M12) to remediate:
 * - V02 (CWE-639 Broken Object-Level Authorization / IDOR)
 * - V04 (CWE-79 Stored Cross-Site Scripting via Event Handlers)
 */
class ReportController {
  /**
   * Submit a new Threat Incident Report
   * Remediates V04 (CWE-79) by replacing naive regex blacklist with SanitizerService
   */
  static async submitReport(req, res) {
    const { title, summary, tlp = 'AMBER' } = req.body;
    const contentMarkdown = req.body.contentMarkdown || req.body.content_markdown;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!title || !summary || !contentMarkdown) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Title, summary, and contentMarkdown are required fields'
      });
    }

    const validTlps = ['CLEAR', 'GREEN', 'AMBER', 'RED'];
    const normalizedTlp = (tlp || 'AMBER').toUpperCase();
    if (!validTlps.includes(normalizedTlp)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid TLP level. Must be one of: [${validTlps.join(', ')}]`
      });
    }

    // Input Sanitization (V04 Remediation):
    // 1. Strip all HTML from plain-text fields
    const sanitizedTitle = SanitizerService.stripHtml(title);
    const sanitizedSummary = SanitizerService.stripHtml(summary);

    // 2. Canonicalize & sanitize rich Markdown:
    // Strips script/iframe/dangerous tags, neutralizes ALL on* event handlers,
    // and blocks dangerous URI schemes (javascript:, data:, vbscript:)
    const sanitizedMarkdown = SanitizerService.sanitizeMarkdown(contentMarkdown);

    const reportId = 'rep-' + crypto.randomUUID();

    try {
      await dbRun(
        `INSERT INTO threat_reports (id, org_id, author_id, title, summary, content_markdown, tlp_level, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING');`,
        [reportId, req.user.orgId, req.user.id, sanitizedTitle, sanitizedSummary, sanitizedMarkdown, normalizedTlp]
      );

      await AuditService.logEvent({
        userId: req.user.id,
        eventType: 'REPORT_SUBMITTED',
        ipAddress: clientIp,
        resourceId: reportId,
        actionDetails: `Threat report '${sanitizedTitle}' (TLP:${normalizedTlp}) submitted by '${req.user.username}'`
      });

      return res.status(201).json({
        message: 'Threat incident report submitted successfully. Queued for analyst review.',
        report: {
          id: reportId,
          title: sanitizedTitle,
          tlp: normalizedTlp,
          status: 'PENDING',
          authorOrg: req.user.orgId,
          createdAt: new Date().toISOString()
        }
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to submit threat report'
      });
    }
  }

  /**
   * List Threat Reports (TLP Filtered)
   */
  static async getReports(req, res) {
    const { tlp, status } = req.query;

    let query = `
      SELECT r.id, r.title, r.summary, r.tlp_level, r.status, r.created_at, r.org_id,
             o.name as author_org, u.username as author_user
      FROM threat_reports r
      JOIN organizations o ON r.org_id = o.id
      JOIN users u ON r.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (tlp) {
      query += ' AND r.tlp_level = ?';
      params.push(tlp.toUpperCase());
    }

    if (status) {
      query += ' AND r.status = ?';
      params.push(status.toUpperCase());
    }

    query += ' ORDER BY r.created_at DESC;';

    try {
      const reports = await dbAll(query, params);
      // Enforce TLP & Multi-Tenant filtering on list view
      const authorizedReports = reports.filter((r) => canAccessTLP(req.user, r));
      return res.status(200).json({ count: authorizedReports.length, reports: authorizedReports });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to query threat reports' });
    }
  }

  /**
   * Get single report with its associated indicators
   * Remediates V02 (CWE-639 BOLA / IDOR):
   * Enforces object-level authorization, organization ownership, and TLP clearance.
   * Records unauthorized access attempts in the tamper-evident audit trail.
   */
  static async getReportById(req, res) {
    const { id } = req.params;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    try {
      const report = await dbGet(
        `SELECT r.*, o.name as author_org, u.username as author_user
         FROM threat_reports r
         JOIN organizations o ON r.org_id = o.id
         JOIN users u ON r.author_id = u.id
         WHERE r.id = ?;`,
        [id]
      );

      if (!report) {
        return res.status(404).json({ error: 'Not Found', message: `Threat Report '${id}' not found` });
      }

      // V02 REMEDIATION: Enforce Server-Side Object-Level Authorization & TLP Policy
      const hasAccess = canAccessTLP(req.user, report);
      if (!hasAccess) {
        // Record denied access attempt in immutable audit trail (Forensic non-repudiation)
        await AuditService.logEvent({
          userId: req.user ? req.user.id : null,
          eventType: 'UNAUTHORIZED_REPORT_ACCESS_BLOCKED',
          ipAddress: clientIp,
          resourceId: id,
          actionDetails: `Blocked unauthorized access attempt by user '${req.user ? req.user.username : 'ANONYMOUS'}' (${req.user ? req.user.role : 'NONE'}, Org: '${req.user ? (req.user.orgId || req.user.org_id) : 'NONE'}') to report '${report.title}' (TLP:${report.tlp_level}, Org: '${report.org_id}')`
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access Denied: You lack authorization to view this threat report due to organization or TLP clearance restrictions.'
        });
      }

      // Query indicators associated with this report
      const indicators = await dbAll(
        'SELECT id, type, value_defanged as value, tlp_level, status FROM threat_indicators WHERE report_id = ?;',
        [id]
      );

      return res.status(200).json({
        report: {
          ...report,
          linkedIndicators: indicators
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve threat report' });
    }
  }
}

module.exports = ReportController;
