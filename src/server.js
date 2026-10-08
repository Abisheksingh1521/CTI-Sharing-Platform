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

// Authentication Routes (Guarded by strict auth rate limiter)
app.post('/api/auth/register', authLimiter, AuthController.register);
app.post('/api/auth/login', authLimiter, AuthController.login);
app.post('/api/auth/verify-mfa', authLimiter, AuthController.verifyMfa);
app.get('/api/auth/me', authGuard, AuthController.getProfile);

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
