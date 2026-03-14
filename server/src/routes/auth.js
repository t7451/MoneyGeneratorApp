import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await AuthService.registerUser(data);
    
    req.log.info('user_registered', { email: data.email });
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    
    req.log.warn('register_failed', { error: error.message });
    
    const status = error.message === 'User already exists' ? 409 : 400;
    res.status(status).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.loginUser(data);
    
    req.log.info('user_logged_in', { email: data.email });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    
    req.log.warn('login_failed', { error: error.message });
    
    res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', async (req, res) => {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }
  
  const user = await AuthService.verifyAndGetUser(token);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
  
  res.json({
    success: true,
    data: { user },
  });
});

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile', async (req, res) => {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }
  
  const currentUser = await AuthService.verifyAndGetUser(token);
  
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
  
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await AuthService.updateUserProfile(currentUser.id, data);
    
    req.log.info('profile_updated', { userId: currentUser.id });
    
    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', async (req, res) => {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }
  
  const currentUser = await AuthService.verifyAndGetUser(token);
  
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
  
  try {
    const data = changePasswordSchema.parse(req.body);
    await AuthService.changePassword(currentUser.id, data);
    
    req.log.info('password_changed', { userId: currentUser.id });
    
    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    
    const status = error.message === 'Current password is incorrect' ? 401 : 400;
    res.status(status).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/logout
 * Logout (client-side token removal, server acknowledgment)
 */
router.post('/logout', (req, res) => {
  // JWT tokens are stateless, so logout is handled client-side
  // This endpoint exists for logging and potential future token blacklisting
  req.log.info('user_logged_out');
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * POST /auth/refresh
 * Refresh authentication token
 */
router.post('/refresh', async (req, res) => {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }
  
  const user = await AuthService.verifyAndGetUser(token);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
  
  // Generate new token
  const newToken = AuthService.createToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  
  req.log.info('token_refreshed', { userId: user.id });
  
  res.json({
    success: true,
    data: { token: newToken, user },
  });
});

/**
 * Extract Bearer token from request
 */
function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export default router;
