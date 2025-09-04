let verifyIdToken;

try {
  verifyIdToken = require('../config/firebase').verifyIdToken;
} catch (error) {
  console.warn('Firebase Admin SDK not available, using token bypass for development');
  verifyIdToken = null;
}

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authorization header missing or invalid format'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    let decodedToken;
    
    if (verifyIdToken) {
      decodedToken = await verifyIdToken(idToken);
    } else {
      // Temporary workaround: decode token without verification (DEVELOPMENT ONLY)
      console.warn('⚠️  DEVELOPMENT MODE: Token verification bypassed');
      const tokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      decodedToken = {
        uid: tokenPayload.sub || tokenPayload.user_id,
        email: tokenPayload.email,
        name: tokenPayload.name,
        picture: tokenPayload.picture,
        email_verified: tokenPayload.email_verified
      };
    }
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified,
      firebase: decodedToken
    };

    console.log(`🔐 Authenticated user: ${req.user.email} (${req.user.uid})`);
    next();

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    
    let statusCode = 401;
    let message = 'Invalid or expired token';

    if (error.code === 'auth/id-token-expired') {
      message = 'Token has expired';
    } else if (error.code === 'auth/id-token-revoked') {
      message = 'Token has been revoked';
    } else if (error.code === 'auth/invalid-id-token') {
      message = 'Invalid token format';
    } else if (error.code === 'auth/user-not-found') {
      message = 'User not found';
    } else if (error.code === 'auth/user-disabled') {
      message = 'User account has been disabled';
      statusCode = 403;
    }

    return res.status(statusCode).json({
      success: false,
      error: 'Authentication failed',
      message: message,
      code: error.code || 'auth/unknown-error'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      req.user = null;
      return next();
    }

    let decodedToken;
    
    if (verifyIdToken) {
      decodedToken = await verifyIdToken(idToken);
    } else {
      // Temporary workaround: decode token without verification (DEVELOPMENT ONLY)
      const tokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      decodedToken = {
        uid: tokenPayload.sub || tokenPayload.user_id,
        email: tokenPayload.email,
        name: tokenPayload.name,
        picture: tokenPayload.picture,
        email_verified: tokenPayload.email_verified
      };
    }
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified,
      firebase: decodedToken
    };

    console.log(`🔐 Optional auth - user: ${req.user.email} (${req.user.uid})`);
    next();

  } catch (error) {
    console.log('⚠️ Optional auth failed, continuing without user:', error.message);
    req.user = null;
    next();
  }
};

const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required',
      message: 'Please verify your email address to access this feature'
    });
  }

  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRoles = req.user.firebase.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  authenticateUser,
  optionalAuth,
  requireEmailVerification,
  requireRole
};