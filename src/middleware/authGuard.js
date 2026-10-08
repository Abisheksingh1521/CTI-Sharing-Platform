const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_hmac_sha256_key_change_in_production';

/**
 * Authentication Guard Middleware
 * Verifies Bearer JWT token and extracts authenticated identity
 */
function authGuard(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header with Bearer token'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected "Bearer <token>"'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'MFA_TEMP') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Temporary MFA token cannot be used to access protected resources. Complete MFA verification first.'
      });
    }

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      orgId: decoded.orgId
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token has expired'
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or forged authentication token'
    });
  }
}

module.exports = {
  authGuard,
  JWT_SECRET
};
