const User = require('../models/User');

/**
 * Middleware to require admin access
 */
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isAdmin) {
      console.log(`🚫 Admin access denied: ${user.email}`);
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
    }

    console.log(`🔓 Admin access granted: ${user.email} (${user.adminRole || 'admin'})`);
    req.adminUser = user;
    req.adminRole = user.adminRole;
    next();
  } catch (error) {
    console.error('❌ Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify admin status',
      message: error.message
    });
  }
}

/**
 * Middleware to require specific admin role
 */
function requireAdminRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const user = await User.findOne({ firebaseUid: req.user.uid });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      // Check if user has required role
      const userRole = user.adminRole || 'admin';
      if (!allowedRoles.includes(userRole)) {
        console.log(`🚫 Insufficient admin permissions: ${user.email} (${userRole}) - Required: ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Required role: ${allowedRoles.join(' or ')}. You have: ${userRole}`
        });
      }

      console.log(`🔓 Admin role check passed: ${user.email} (${userRole})`);
      req.adminUser = user;
      req.adminRole = userRole;
      next();
    } catch (error) {
      console.error('❌ Admin role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify admin role',
        message: error.message
      });
    }
  };
}

module.exports = {
  requireAdmin,
  requireAdminRole
};
