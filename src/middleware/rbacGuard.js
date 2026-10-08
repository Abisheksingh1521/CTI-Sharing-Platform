/**
 * Role-Based Access Control (RBAC) Guard Middleware
 * Evaluates whether authenticated user's role is in the allowed roles list.
 */
function rbacGuard(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication context required for RBAC evaluation'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role in [${allowedRoles.join(', ')}], but your role is '${req.user.role}'`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

module.exports = {
  rbacGuard
};
