const rateLimit = require('express-rate-limit');

// Strict Rate Limiting on Authentication Endpoints (Brute-Force Protection)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10),
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP. Please wait 60 seconds before trying again.'
  }
});

// General API Rate Limiting (DoS Mitigation)
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please throttle your requests.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
