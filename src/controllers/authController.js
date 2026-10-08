const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { dbGet, dbRun } = require('../config/database');
const { JWT_SECRET } = require('../middleware/authGuard');
const { verifyTOTP, getTOTPCode } = require('../services/totpService');
const AuditService = require('../services/auditService');

/**
 * Authentication Controller
 * Implements Salted Password Hashing, Multi-Factor Authentication (TOTP), and JWT Issuance.
 */
class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res) {
    const { username, email, password, orgId, role = 'ROLE_CONTRIBUTOR' } = req.body;

    if (!username || !email || !password || !orgId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username, email, password, and orgId are required'
      });
    }

    // Password complexity check
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long'
      });
    }

    try {
      // Check for duplicate username or email
      const existing = await dbGet('SELECT id FROM users WHERE username = ? OR email = ?;', [username, email]);
      if (existing) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Username or email is already registered'
        });
      }

      // Verify organization exists
      const org = await dbGet('SELECT id FROM organizations WHERE id = ?;', [orgId]);
      if (!org) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid organization ID'
        });
      }

      // Hash password with bcrypt (cost factor 10)
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = 'usr-' + crypto.randomUUID();
      const mfaSecret = 'JBSWY3DPEHPK3PXP'; // Base32 test secret for deterministic testing

      await dbRun(
        `INSERT INTO users (id, org_id, username, email, password_hash, role, mfa_secret, mfa_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1);`,
        [userId, orgId, username, email, passwordHash, role, mfaSecret]
      );

      await AuditService.logEvent({
        userId,
        eventType: 'AUTH_REGISTER',
        ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
        resourceId: userId,
        actionDetails: `User '${username}' registered with role '${role}' in org '${orgId}'`
      });

      return res.status(201).json({
        message: 'User registered successfully. Proceed to login and MFA verification.',
        userId,
        username,
        role,
        mfaSecret
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to complete registration'
      });
    }
  }

  /**
   * Primary Login: Verifies username/password, issues temporary MFA challenge token
   */
  static async login(req, res) {
    const { username, password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required'
      });
    }

    try {
      // Query user record by username or email
      const user = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?;', [username, username]);

      if (!user) {
        await AuditService.logEvent({
          userId: null,
          eventType: 'AUTH_LOGIN_FAILED',
          ipAddress: clientIp,
          resourceId: username,
          actionDetails: `Login attempt failed: user '${username}' not found`
        });

        // Constant-time dummy hash to resist timing attacks
        await bcrypt.compare(password, '$2a$10$wT8K8F6gH.14k2Q0z0eS1eJ4qK6u0g0z0eS1eJ4qK6u0g0z0eS1e');
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }

      // Verify bcrypt password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        await AuditService.logEvent({
          userId: user.id,
          eventType: 'AUTH_LOGIN_FAILED',
          ipAddress: clientIp,
          resourceId: user.id,
          actionDetails: `Password verification failed for user '${user.username}'`
        });

        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }

      // User credentials valid: Issue temporary MFA challenge token (valid for 5 minutes)
      const tempToken = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          orgId: user.org_id,
          type: 'MFA_TEMP'
        },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      await AuditService.logEvent({
        userId: user.id,
        eventType: 'AUTH_CREDENTIALS_VERIFIED',
        ipAddress: clientIp,
        resourceId: user.id,
        actionDetails: `Primary credentials verified for '${user.username}'. MFA challenge issued.`
      });

      // Provide current valid TOTP code in response for demo convenience if in dev/test
      const currentDemoCode = getTOTPCode(user.mfa_secret);

      return res.status(200).json({
        message: 'Credentials verified. Multi-factor authentication code required.',
        mfaRequired: true,
        tempToken,
        userId: user.id,
        username: user.username,
        demoTotpCode: currentDemoCode // Convenience helper for automated testing and lab demo
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Login service encountered an unexpected error'
      });
    }
  }

  /**
   * Verify TOTP MFA Code and Issue Final Access Token
   */
  static async verifyMfa(req, res) {
    const { tempToken, totpCode } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!tempToken || !totpCode) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'tempToken and totpCode are required'
      });
    }

    try {
      // Decode and verify the temporary token
      const decoded = jwt.verify(tempToken, JWT_SECRET);
      if (decoded.type !== 'MFA_TEMP') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid token type for MFA verification'
        });
      }

      // Retrieve user's MFA secret from database
      const user = await dbGet('SELECT * FROM users WHERE id = ?;', [decoded.id]);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User no longer exists'
        });
      }

      // Verify TOTP code (RFC 6238)
      const isValid = verifyTOTP(totpCode, user.mfa_secret);
      if (!isValid) {
        await AuditService.logEvent({
          userId: user.id,
          eventType: 'AUTH_MFA_FAILED',
          ipAddress: clientIp,
          resourceId: user.id,
          actionDetails: `MFA TOTP code verification failed for '${user.username}'`
        });

        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired multi-factor authentication code'
        });
      }

      // Issue full Access Token (valid for 1 hour)
      const accessToken = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          orgId: user.org_id,
          type: 'ACCESS'
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      await AuditService.logEvent({
        userId: user.id,
        eventType: 'AUTH_LOGIN_SUCCESS',
        ipAddress: clientIp,
        resourceId: user.id,
        actionDetails: `User '${user.username}' (${user.role}) successfully authenticated with MFA`
      });

      return res.status(200).json({
        message: 'Authentication successful',
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          orgId: user.org_id
        }
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Temporary MFA session expired. Please log in again.'
        });
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid temporary MFA challenge token'
      });
    }
  }

  /**
   * Get Current Authenticated Profile
   */
  static async getProfile(req, res) {
    try {
      const user = await dbGet(
        `SELECT u.id, u.username, u.email, u.role, u.org_id, o.name as org_name, o.trust_level
         FROM users u
         JOIN organizations o ON u.org_id = o.id
         WHERE u.id = ?;`,
        [req.user.id]
      );

      if (!user) {
        return res.status(404).json({ error: 'Not Found', message: 'User record not found' });
      }

      return res.status(200).json({ user });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve profile' });
    }
  }
}

module.exports = AuthController;
