const { dbGet } = require('../config/database');

/**
 * Prometheus Metrics Exporter Service (CTI-110, Phase 15)
 * Gathers system operational and security metrics formatted in standard Prometheus exposition format.
 */
class MetricsService {
  static httpRequestsTotal = 0;
  static httpRequestsByStatus = {};
  static failedLoginsTotal = 0;

  static recordHttpRequest(method, status) {
    this.httpRequestsTotal++;
    const key = `${method}_${status}`;
    this.httpRequestsByStatus[key] = (this.httpRequestsByStatus[key] || 0) + 1;
  }

  static recordFailedLogin() {
    this.failedLoginsTotal++;
  }

  static async generateMetrics() {
    const uptime = process.uptime();

    // Query DB metrics
    const totalIndicators = await dbGet('SELECT COUNT(*) as count FROM threat_indicators;');
    const pendingIndicators = await dbGet("SELECT COUNT(*) as count FROM threat_indicators WHERE status = 'PENDING';");
    const approvedIndicators = await dbGet("SELECT COUNT(*) as count FROM threat_indicators WHERE status = 'APPROVED';");
    const redIndicators = await dbGet("SELECT COUNT(*) as count FROM threat_indicators WHERE tlp_level = 'RED';");
    const auditRecords = await dbGet('SELECT COUNT(*) as count FROM audit_logs;');

    const lines = [
      '# HELP cti_http_requests_total Total number of HTTP requests processed by CTI platform',
      '# TYPE cti_http_requests_total counter',
      `cti_http_requests_total ${this.httpRequestsTotal}`
    ];

    for (const [key, count] of Object.entries(this.httpRequestsByStatus)) {
      const [method, status] = key.split('_');
      lines.push(`cti_http_requests_status{method="${method}",status="${status}"} ${count}`);
    }

    lines.push(
      '',
      '# HELP cti_failed_logins_total Total number of failed authentication attempts (Potential Brute-Force / Credential Stuffing)',
      '# TYPE cti_failed_logins_total counter',
      `cti_failed_logins_total ${this.failedLoginsTotal}`,
      '',
      '# HELP cti_indicators_total Total threat indicators cataloged by status and classification',
      '# TYPE cti_indicators_total gauge',
      `cti_indicators_total{status="ALL"} ${totalIndicators?.count || 0}`,
      `cti_indicators_total{status="PENDING"} ${pendingIndicators?.count || 0}`,
      `cti_indicators_total{status="APPROVED"} ${approvedIndicators?.count || 0}`,
      `cti_indicators_total{tlp="RED"} ${redIndicators?.count || 0}`,
      '',
      '# HELP cti_audit_records_total Total number of cryptographically chained audit log entries',
      '# TYPE cti_audit_records_total gauge',
      `cti_audit_records_total ${auditRecords?.count || 0}`,
      '',
      '# HELP cti_process_uptime_seconds Application process uptime in seconds',
      '# TYPE cti_process_uptime_seconds gauge',
      `cti_process_uptime_seconds ${Math.floor(uptime)}`
    );

    return lines.join('\n') + '\n';
  }
}

module.exports = MetricsService;
