/**
 * Auth Service for D1 (Cloudflare SQLite)
 * Ported from Express authController.ts for worker deployment
 */

import { D1Database, generateD1UUID, queryD1First, queryD1, executeD1 } from '../config/d1';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateNumericCode,
  generateSecureToken,
  hashToken,
  verifyTotpCode,
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  buildOtpAuthUrl,
} from '../utils/auth';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'partner' | 'admin';
  avatar_url?: string;
  bio?: string;
  phone?: string;
  address?: string;
  two_factor_enabled: boolean;
  email_verified_at?: string;
}

export async function signupD1(
  db: D1Database,
  email: string,
  name: string,
  password: string
): Promise<{ twoFactorToken: string; requiresTwoFactor: boolean }> {
  // Check if user exists
  const existingUser = await queryD1First(db, 'SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Create user
  const userId = generateD1UUID();
  const passwordHash = await hashPassword(password);

  await executeD1(
    db,
    `INSERT INTO users (id, email, name, password_hash, role, two_factor_enabled, terms_accepted_at)
     VALUES (?, ?, ?, ?, 'user', 1, CURRENT_TIMESTAMP)`,
    [userId, email, name, passwordHash]
  );

  const user = { id: userId, email, name, role: 'user' as const };
  const challenge = await createEmailVerificationChallenge(db, user);

  return {
    twoFactorToken: challenge.twoFactorToken,
    requiresTwoFactor: true,
  };
}

export async function loginD1(
  db: D1Database,
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  user?: AuthUser;
  token?: string;
  twoFactorToken?: string;
  requiresTwoFactor?: boolean;
  twoFactorMethod?: 'email' | 'totp';
}> {
  // Get user
  const user = await queryD1First(
    db,
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }

  // Compare password
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    // Update failed login count
    await executeD1(
      db,
      `UPDATE users
       SET failed_login_count = COALESCE(failed_login_count, 0) + 1,
           locked_until = CASE
             WHEN COALESCE(failed_login_count, 0) + 1 >= 10 THEN datetime('now', '+15 minutes')
             ELSE locked_until
           END
       WHERE id = ?`,
      [user.id]
    );

    await recordAuthEvent(db, {
      userId: user.id,
      eventType: 'login_failed',
      ipAddress,
      userAgent,
    });

    throw new Error('Invalid credentials');
  }

  // Reset failed login count
  await executeD1(
    db,
    `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?`,
    [user.id]
  );

  // Check email verification
  if (!user.email_verified_at) {
    const challenge = await createEmailVerificationChallenge(db, user);
    return {
      requiresTwoFactor: true,
      twoFactorToken: challenge.twoFactorToken,
      twoFactorMethod: 'email',
    };
  }

  // Check TOTP 2FA
  if (user.two_factor_enabled && user.two_factor_secret_encrypted && user.two_factor_confirmed_at) {
    const challenge = createTotpChallenge(user);
    return {
      requiresTwoFactor: true,
      twoFactorToken: challenge.twoFactorToken,
      twoFactorMethod: 'totp',
    };
  }

  // No 2FA, send email verification
  const challenge = await createEmailVerificationChallenge(db, user);
  return {
    requiresTwoFactor: true,
    twoFactorToken: challenge.twoFactorToken,
    twoFactorMethod: 'email',
  };
}

export async function verifyTwoFactorD1(
  db: D1Database,
  twoFactorToken: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: AuthUser; token: string }> {
  const decoded = verifyToken(twoFactorToken);

  if (decoded.purpose !== 'two_factor' && decoded.purpose !== 'email_verification') {
    throw new Error('Invalid two-factor token');
  }

  const user = await queryD1First(
    db,
    `SELECT * FROM users WHERE id = ?`,
    [decoded.id]
  );

  if (!user) {
    throw new Error('User not found');
  }

  if (decoded.purpose === 'email_verification' || decoded.method === 'email') {
    // Verify email code
    if (!user.two_factor_code_hash || !user.two_factor_code_expires_at) {
      throw new Error('Verification code has expired');
    }

    const now = new Date();
    const expireTime = new Date(user.two_factor_code_expires_at);
    if (now > expireTime) {
      throw new Error('Verification code has expired');
    }

    const isValidEmailCode = await comparePassword(code, user.two_factor_code_hash);
    if (!isValidEmailCode) {
      throw new Error('Invalid verification code');
    }

    // Mark email as verified
    await executeD1(
      db,
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
           two_factor_code_hash = NULL,
           two_factor_code_expires_at = NULL,
           last_login_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [user.id]
    );
  } else {
    // Verify TOTP code
    if (!user.two_factor_enabled || !user.two_factor_secret_encrypted) {
      throw new Error('Two-factor authentication is not enabled');
    }

    const secret = decryptSecret(user.two_factor_secret_encrypted);
    const isValidCode = verifyTotpCode(secret, code);

    if (!isValidCode) {
      throw new Error('Invalid two-factor code');
    }

    await executeD1(
      db,
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [user.id]
    );
  }

  await recordAuthEvent(db, {
    userId: user.id,
    eventType: 'two_factor_success',
    ipAddress,
    userAgent,
  });

  const authUser = toAuthUser(user);
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return { user: authUser, token };
}

export async function getProfileD1(db: D1Database, userId: string): Promise<AuthUser> {
  const user = await queryD1First(
    db,
    'SELECT id, email, name, role, avatar_url, bio, phone, address, two_factor_enabled, created_at FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    throw new Error('User not found');
  }

  return toAuthUser(user);
}

export async function updateProfileD1(
  db: D1Database,
  userId: string,
  updates: { name?: string; avatar_url?: string; bio?: string; phone?: string; address?: string }
): Promise<AuthUser> {
  const { name, avatar_url, bio, phone, address } = updates;

  const result = await queryD1First(
    db,
    `UPDATE users 
     SET name = COALESCE(?, name), 
         avatar_url = COALESCE(?, avatar_url),
         bio = COALESCE(?, bio),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
     RETURNING id, email, name, role, avatar_url, bio, phone, address, two_factor_enabled`,
    [name, avatar_url, bio, phone, address, userId]
  );

  if (!result) {
    throw new Error('User not found');
  }

  return toAuthUser(result);
}

/**
 * Helper functions
 */

async function createEmailVerificationChallenge(
  db: D1Database,
  user: { id: string; email: string; role: string }
): Promise<{ twoFactorToken: string }> {
  const code = generateNumericCode();
  const codeHash = await hashPassword(code);

  await executeD1(
    db,
    `UPDATE users
     SET two_factor_code_hash = ?,
         two_factor_code_expires_at = datetime('now', '+10 minutes')
     WHERE id = ?`,
    [codeHash, user.id]
  );

  // TODO: Send email with code via emailService

  const twoFactorToken = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    purpose: 'email_verification',
    method: 'email',
  });

  return { twoFactorToken };
}

function createTotpChallenge(user: { id: string; email: string; role: string }): { twoFactorToken: string } {
  const twoFactorToken = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    purpose: 'two_factor',
    method: 'totp',
  });

  return { twoFactorToken };
}

async function recordAuthEvent(
  db: D1Database,
  event: {
    userId?: string;
    eventType: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await executeD1(
    db,
    `INSERT INTO auth_events (id, user_id, event_type, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [generateD1UUID(), event.userId, event.eventType, event.ipAddress, event.userAgent]
  );
}

function toAuthUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'user' | 'partner' | 'admin',
    avatar_url: user.avatar_url,
    bio: user.bio,
    phone: user.phone,
    address: user.address,
    two_factor_enabled: Boolean(user.two_factor_enabled && user.two_factor_confirmed_at),
    email_verified_at: user.email_verified_at,
  };
}
