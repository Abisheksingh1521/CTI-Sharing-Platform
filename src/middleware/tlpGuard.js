/**
 * Traffic Light Protocol (TLP) Authorization Engine (CTI-107)
 * Implements explicit Attribute-Based Access Control (ABAC) policy rules
 * to prevent unauthorized intelligence disclosure and sensitive data leakage.
 */

const TLP_LEVELS = {
  CLEAR: 'CLEAR',
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED: 'RED'
};

/**
 * Explicit TLP Access Authorization Policy
 * Evaluates whether an authenticated user is permitted to access a specific threat indicator or report.
 *
 * @param {Object} user - The authenticated user object { id, role, orgId, orgTrustLevel }
 * @param {Object} indicator - The threat resource { id, tlp_level, org_id }
 * @returns {Boolean} - True if access is permitted, false otherwise
 */
function canAccessTLP(user, indicator) {
  if (!user || !indicator) return false;

  const tlp = (indicator.tlp_level || 'AMBER').toUpperCase();
  const userRole = user.role;
  const userOrgId = user.orgId || user.org_id;
  const resourceOrgId = indicator.org_id || indicator.orgId;

  // 1. TLP:CLEAR (formerly WHITE)
  // Rule: Accessible to all authenticated users (Consumer, Contributor, Analyst, Admin)
  if (tlp === TLP_LEVELS.CLEAR) {
    return true;
  }

  // 2. TLP:GREEN
  // Rule: Accessible across verified participating community organizations.
  // Allowed for Contributor, Analyst, Admin, and verified Consumer organizations.
  if (tlp === TLP_LEVELS.GREEN) {
    // If user belongs to an unvetted/suspended entity, access is restricted
    if (user.trust_level === 'PROBATIONARY') {
      return false;
    }
    return ['ROLE_ADMIN', 'ROLE_ANALYST', 'ROLE_CONTRIBUTOR', 'ROLE_CONSUMER'].includes(userRole);
  }

  // 3. TLP:AMBER
  // Rule: Restricted to the submitting organization, authorized security analysts, and administrators.
  // Standard external consumers (ROLE_CONSUMER) and other non-originating contributors are DENIED.
  if (tlp === TLP_LEVELS.AMBER) {
    if (['ROLE_ADMIN', 'ROLE_ANALYST'].includes(userRole)) {
      return true;
    }
    // Submitting organization members have access
    if (userOrgId && resourceOrgId && userOrgId === resourceOrgId) {
      return true;
    }
    return false;
  }

  // 4. TLP:RED
  // Rule: Strictly confidential. Accessible ONLY to originating organization contributors,
  // and authorized Senior Analysts / Platform Administrators.
  // General consumers (ROLE_CONSUMER) are strictly prohibited and NEVER receive TLP:RED in feeds.
  if (tlp === TLP_LEVELS.RED) {
    if (userRole === 'ROLE_ADMIN' || userRole === 'ROLE_ANALYST') {
      return true;
    }
    if (userRole === 'ROLE_CONTRIBUTOR' && userOrgId && resourceOrgId && userOrgId === resourceOrgId) {
      return true;
    }
    // Consumers, SIEMs, and external contributors are strictly denied TLP:RED
    return false;
  }

  // Default fail-safe: Deny access for unknown TLP markings
  return false;
}

/**
 * Express Middleware to enforce TLP clearance on single resource lookups
 */
function tlpGuard(resourceLocatorFn) {
  return async (req, res, next) => {
    try {
      const resource = await resourceLocatorFn(req);
      if (!resource) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Requested intelligence resource not found'
        });
      }

      const permitted = canAccessTLP(req.user, resource);
      if (!permitted) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Insufficient clearance for ${resource.tlp_level || 'classified'} intelligence`,
          resourceTlp: resource.tlp_level,
          userRole: req.user.role
        });
      }

      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  canAccessTLP,
  tlpGuard,
  TLP_LEVELS
};
