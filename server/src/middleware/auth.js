/**
 * Authentication Middleware
 * Provides JWT token verification for protected routes
 */

import { AuthService } from '../services/authService.js';

/**
 * Extract Bearer token from request
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Middleware to authenticate JWT token
 * Attaches user object to req.user if valid
 */
export async function authenticateToken(req, res, next) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_TOKEN',
    });
  }
  
  try {
    const user = await AuthService.verifyAndGetUser(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but allows request to continue if not
 */
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  
  if (token) {
    try {
      const user = await AuthService.verifyAndGetUser(token);
      if (user) {
        req.user = user;
        req.token = token;
      }
    } catch (error) {
      // Ignore errors for optional auth
    }
  }
  
  next();
}

/**
 * Middleware to require specific subscription plan
 */
export function requirePlan(...allowedPlans) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_USER',
      });
    }

    const userPlan = req.user.subscriptionPlan || 'free';
    
    if (!allowedPlans.includes(userPlan)) {
      return res.status(403).json({
        success: false,
        error: 'Upgrade required',
        code: 'PLAN_REQUIRED',
        requiredPlans: allowedPlans,
        currentPlan: userPlan,
      });
    }
    
    next();
  };
}

export default {
  authenticateToken,
  optionalAuth,
  extractToken,
  requirePlan,
};
