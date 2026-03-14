import crypto from 'crypto';
import { config } from '../config.js';
import { isDatabaseConnected, queryOne, queryAll, query } from '../database.js';

// JWT secret (from config or generate a random one)
const JWT_SECRET = config.jwt?.secret || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = config.jwt?.expiresIn || process.env.JWT_EXPIRES_IN || '7d';

// In-memory user storage (fallback when database not available)
const memoryUsers = new Map();

// Password hashing using PBKDF2
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * Hash a password using PBKDF2
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

/**
 * Create a JWT token
 */
function createToken(payload, expiresIn = JWT_EXPIRES_IN) {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  // Parse expiration
  let expiresAt;
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (match) {
    const [, num, unit] = match;
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    expiresAt = Date.now() + parseInt(num) * multipliers[unit];
  } else {
    expiresAt = Date.now() + 7 * 86400000; // Default 7 days
  }
  
  const tokenPayload = { ...payload, exp: expiresAt, iat: Date.now() };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      return null;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // Check expiration
    if (decoded.exp && decoded.exp < Date.now()) {
      return null;
    }
    
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Convert database row to user object
 */
function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    lastLoginAt: row.last_login_at?.toISOString?.() || row.last_login_at,
    emailVerified: row.email_verified,
    isActive: row.is_active,
  };
}

/**
 * Register a new user
 */
export async function registerUser({ email, password, name, role = 'user' }) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Validate password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  // Check if user exists
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = hashPassword(password);
  const userName = name?.trim() || normalizedEmail.split('@')[0];
  
  let user;
  
  if (isDatabaseConnected()) {
    // Check if user exists in database
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing) {
      throw new Error('User already exists');
    }
    
    // Insert user into database
    const result = await queryOne(`
      INSERT INTO users (email, name, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, created_at, updated_at
    `, [normalizedEmail, userName, passwordHash, role]);
    
    user = rowToUser(result);
  } else {
    // Use in-memory storage
    if (memoryUsers.has(normalizedEmail)) {
      throw new Error('User already exists');
    }
    
    const userId = crypto.randomUUID();
    user = {
      id: userId,
      email: normalizedEmail,
      name: userName,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    memoryUsers.set(normalizedEmail, user);
  }
  
  // Generate token
  const token = createToken({ 
    userId: user.id, 
    email: user.email, 
    role: user.role 
  });
  
  return {
    user: sanitizeUser(user),
    token,
  };
}

/**
 * Login a user
 */
export async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  
  let user;
  
  if (isDatabaseConnected()) {
    const row = await queryOne('SELECT * FROM users WHERE email = $1 AND is_active = true', [normalizedEmail]);
    if (!row) {
      throw new Error('Invalid email or password');
    }
    user = rowToUser(row);
  } else {
    user = memoryUsers.get(normalizedEmail);
    if (!user) {
      throw new Error('Invalid email or password');
    }
  }
  
  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid email or password');
  }
  
  // Update last login
  const now = new Date().toISOString();
  
  if (isDatabaseConnected()) {
    await query('UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2', [now, user.id]);
    user.lastLoginAt = now;
    user.updatedAt = now;
  } else {
    user.lastLoginAt = now;
    user.updatedAt = now;
  }
  
  // Generate token
  const token = createToken({ 
    userId: user.id, 
    email: user.email, 
    role: user.role 
  });
  
  return {
    user: sanitizeUser(user),
    token,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  if (isDatabaseConnected()) {
    const row = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    return row ? sanitizeUser(rowToUser(row)) : null;
  } else {
    for (const user of memoryUsers.values()) {
      if (user.id === userId) {
        return sanitizeUser(user);
      }
    }
    return null;
  }
}

/**
 * Verify a token and get user
 */
export async function verifyAndGetUser(token) {
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }
  
  const user = await getUserById(decoded.userId);
  if (!user) {
    return null;
  }
  
  return { ...user, tokenPayload: decoded };
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, updates) {
  if (isDatabaseConnected()) {
    // Build update query dynamically
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (updates.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name.trim());
    }
    if (updates.email) {
      const newEmail = updates.email.toLowerCase().trim();
      // Check if email is already in use
      const existing = await queryOne('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, userId]);
      if (existing) {
        throw new Error('Email already in use');
      }
      fields.push(`email = $${paramIndex++}`);
      values.push(newEmail);
    }
    
    if (fields.length === 0) {
      const user = await getUserById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }
    
    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(userId);
    
    const result = await queryOne(`
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    if (!result) throw new Error('User not found');
    return sanitizeUser(rowToUser(result));
  } else {
    // In-memory update
    for (const [email, user] of memoryUsers.entries()) {
      if (user.id === userId) {
        if (updates.name) user.name = updates.name.trim();
        if (updates.email) {
          const newEmail = updates.email.toLowerCase().trim();
          if (newEmail !== email && memoryUsers.has(newEmail)) {
            throw new Error('Email already in use');
          }
          user.email = newEmail;
          memoryUsers.delete(email);
          memoryUsers.set(newEmail, user);
        }
        user.updatedAt = new Date().toISOString();
        return sanitizeUser(user);
      }
    }
    throw new Error('User not found');
  }
}

/**
 * Change password
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }
  
  if (isDatabaseConnected()) {
    const row = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    if (!row) throw new Error('User not found');
    
    const user = rowToUser(row);
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error('Current password is incorrect');
    }
    
    const newHash = hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', 
      [newHash, new Date().toISOString(), userId]);
    
    return true;
  } else {
    for (const user of memoryUsers.values()) {
      if (user.id === userId) {
        if (!verifyPassword(currentPassword, user.passwordHash)) {
          throw new Error('Current password is incorrect');
        }
        user.passwordHash = hashPassword(newPassword);
        user.updatedAt = new Date().toISOString();
        return true;
      }
    }
    throw new Error('User not found');
  }
}

/**
 * Remove sensitive fields from user object
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, password_hash, ...safe } = user;
  return safe;
}

/**
 * Export for middleware use
 */
export const AuthService = {
  registerUser,
  loginUser,
  getUserById,
  verifyAndGetUser,
  updateUserProfile,
  changePassword,
  verifyToken,
  createToken,
};

export default AuthService;
