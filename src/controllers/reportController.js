const crypto = require('crypto');
const { dbGet, dbRun, dbAll } = require('../config/database');
const AuditService = require('../services/auditService');

/**
 * Threat Report Submission & Management Controller (CTI-105)
 */
class ReportController {
  /**
   * Submit a new Threat Incident Report
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

    // Input Sanitization: Mitigate Stored XSS by escaping script tags and dangerous HTML
    const sanitizedTitle = title.trim().replace(/<[^>]*>?/gm, '');
    const sanitizedSummary = summary.trim().replace(/<[^>]*>?/gm, '');
    const sanitizedMarkdown = contentMarkdown
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
      .replace(/javascript:/gi, 'blocked:')
      .replace(/onerror=/gi, 'blocked=')
      .replace(/onload=/gi, 'blocked=');

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
   * List Threat Reports
   */
  static async getReports(req, res) {
    const { tlp, status } = req.query;

    let query = `
      SELECT r.id, r.title, r.summary, r.tlp_level, r.status, r.created_at,
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
      return res.status(200).json({ count: reports.length, reports });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to query threat reports' });
    }
  }

  /**
   * Get single report with its associated indicators
   */
  static async getReportById(req, res) {
    const { id } = req.params;

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
