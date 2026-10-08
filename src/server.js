require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./config/database');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { authGuard } = require('./middleware/authGuard');
const { rbacGuard } = require('./middleware/rbacGuard');
const AuthController = require('./controllers/authController');
const IoCController = require('./controllers/iocController');
const ReportController = require('./controllers/reportController');
const TriageController = require('./controllers/triageController');
const FeedController = require('./controllers/feedController');
const AuditController = require('./controllers/auditController');
const MetricsService = require('./services/metricsService');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware: Helmet for OWASP Secure Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:']
      }
    }
  })
);

app.use(cors());
app.use(express.json({ limit: '100kb' })); // Mitigate DoS via large payloads
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Request Metrics Instrumentation
app.use((req, res, next) => {
  res.on('finish', () => {
    MetricsService.recordHttpRequest(req.method, res.statusCode);
  });
  next();
});

// Static frontend serving
app.use(express.static(path.join(__dirname, 'public')));

// General API Rate Limiting
app.use('/api/', apiLimiter);

// Liveness & Readiness Probes (Kubernetes / Docker)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'cyber-threat-intelligence-platform',
    version: '1.0.0'
  });
});

// Prometheus Metrics Endpoint (CTI-110, Phase 15)
app.get('/metrics', async (req, res) => {
  try {
    const metricsData = await MetricsService.generateMetrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.status(200).send(metricsData);
  } catch (err) {
    return res.status(500).send('# Error generating metrics');
  }
});

// Authentication Routes (Guarded by strict auth rate limiter)
app.post('/api/auth/register', authLimiter, AuthController.register);
app.post('/api/auth/login', authLimiter, AuthController.login);
app.post('/api/auth/verify-mfa', authLimiter, AuthController.verifyMfa);
app.get('/api/auth/me', authGuard, AuthController.getProfile);

// Threat Indicator (IoC) Routes (CTI-103, CTI-104)
app.post('/api/iocs', authGuard, rbacGuard(['ROLE_CONTRIBUTOR', 'ROLE_ANALYST', 'ROLE_ADMIN']), IoCController.submitIoC);
app.get('/api/iocs', authGuard, IoCController.getIoCs);
app.get('/api/iocs/:id', authGuard, IoCController.getIoCById);

// Threat Incident Report Routes (CTI-105)
app.post('/api/reports', authGuard, rbacGuard(['ROLE_CONTRIBUTOR', 'ROLE_ANALYST', 'ROLE_ADMIN']), ReportController.submitReport);
app.get('/api/reports', authGuard, ReportController.getReports);
app.get('/api/reports/:id', authGuard, ReportController.getReportById);

// Analyst Triage Workbench Routes (CTI-106, CTI-107)
app.get('/api/triage/pending', authGuard, rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN']), TriageController.getPendingQueue);
app.put('/api/iocs/:id/triage', authGuard, rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN']), TriageController.triageIoC);

// STIX 2.1 Threat Feeds & Blocklist Routes (CTI-108)
app.get('/api/feeds/stix', authGuard, FeedController.getSTIXFeed);
app.get('/api/feeds/blocklist', authGuard, FeedController.getFirewallBlocklist);

// Tamper-Evident Audit Log Routes (CTI-109, Admin-only)
app.get('/api/audit', authGuard, rbacGuard(['ROLE_ADMIN']), AuditController.getAuditLogs);
app.get('/api/audit/verify', authGuard, rbacGuard(['ROLE_ADMIN']), AuditController.verifyAuditChain);

// RBAC Role Verification Test Endpoints
app.get('/api/test/analyst-only', authGuard, rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN']), (req, res) => {
  res.status(200).json({
    message: 'Authorized analyst access granted',
    user: req.user
  });
});

app.get('/api/test/admin-only', authGuard, rbacGuard(['ROLE_ADMIN']), (req, res) => {
  res.status(200).json({
    message: 'Authorized platform administrator access granted',
    user: req.user
  });
});

// Centralized Error Handling Middleware (Suppresses sensitive stack traces)
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred',
    ...(isDev ? { stack: err.stack } : {})
  });
});

// Start Server if not loaded as a test module
if (require.main === module) {
  initDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[CTI-SERVER] Platform active on http://localhost:${PORT}`);
        console.log(`[CTI-SERVER] Health check: http://localhost:${PORT}/api/health`);
      });
    })
    .catch(err => {
      console.error('[CTI-SERVER] Failed to initialize database on startup:', err);
      process.exit(1);
    });
}

module.exports = app;
