const { dbAll } = require('../config/database');
const { canAccessTLP } = require('../middleware/tlpGuard');
const { STIXFactory } = require('../services/stixFactory');
const AuditService = require('../services/auditService');

/**
 * Threat Feed Distribution Controller (CTI-108)
 * Implements server-side explicit TLP filtering and STIX 2.1 Bundle serialization.
 */
class FeedController {
  /**
   * Export approved threat intelligence in OASIS STIX 2.1 JSON format
   */
  static async getSTIXFeed(req, res) {
    const { type, tlp_max } = req.query;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    try {
      // 1. Fetch only APPROVED indicators from the threat store
      let query = `
        SELECT i.*, o.name as submitter_org, o.trust_level as org_trust_level
        FROM threat_indicators i
        JOIN organizations o ON i.org_id = o.id
        WHERE i.status = 'APPROVED'
      `;
      const params = [];

      if (type) {
        query += ' AND i.type = ?';
        params.push(type.toUpperCase());
      }

      query += ' ORDER BY i.created_at DESC;';

      const allApprovedIoCs = await dbAll(query, params);

      // 2. Execute Server-Side Explicit TLP Filtering
      // Evaluate canAccessTLP(req.user, indicator) for every item before serialization
      const authorizedIoCs = allApprovedIoCs.filter(ioc => {
        return canAccessTLP(req.user, ioc);
      });

      // 3. Serialize into STIX 2.1 JSON Bundle
      const stixBundle = STIXFactory.createBundle(authorizedIoCs);

      // 4. Audit Log feed consumption
      await AuditService.logEvent({
        userId: req.user.id,
        eventType: 'FEED_STIX_PULLED',
        ipAddress: clientIp,
        resourceId: stixBundle.id,
        actionDetails: `STIX 2.1 feed pulled by '${req.user.username}' (${req.user.role}). Delivered ${authorizedIoCs.length}/${allApprovedIoCs.length} indicators after TLP egress filtering.`
      });

      return res.status(200).json(stixBundle);
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate STIX 2.1 threat feed'
      });
    }
  }

  /**
   * Plaintext firewall blocklist export for SIEM / EDR / Firewall integrations
   */
  static async getFirewallBlocklist(req, res) {
    try {
      const approvedIoCs = await dbAll(
        `SELECT type, value, tlp_level, org_id FROM threat_indicators
         WHERE status = 'APPROVED' AND type IN ('IPV4', 'DOMAIN');`
      );

      // Server-side TLP filtering
      const filtered = approvedIoCs
        .filter(ioc => canAccessTLP(req.user, ioc))
        .map(ioc => ioc.value);

      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(filtered.join('\n'));
    } catch (err) {
      return res.status(500).send('# Error generating blocklist');
    }
  }
}

module.exports = FeedController;
