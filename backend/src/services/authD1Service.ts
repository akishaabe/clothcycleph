import { D1Database, generateD1UUID, queryD1, queryD1First, executeD1 } from '../config/d1.js';
import { hashPassword, comparePassword, generateSecureToken } from '../utils/auth.js';
import { signJwt, verifyJwt } from '../utils/workerJwt.js';
import {
  generateNumericCode,
  hashToken,
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotpCode,
  encryptSecret,
  decryptSecret,
} from '../utils/workerTotp.js';
import { sendTwoFactorCode, sendPasswordResetLink, EmailProvider } from './workerEmailService.js';

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

export interface AuthD1Options {
  jwtSecret: string;
  totpEncryptionKey: string;
  emailProvider?: EmailProvider;
  emailApiKey?: string;
  emailFrom?: string;
  appUrl?: string;
  googleClientId?: string;
  exposeDevSecrets?: boolean;
}

export async function signupD1(
  db: D1Database,
  email: string,
  name: string,
  password: string,
  options: AuthD1Options
): Promise<{ twoFactorToken: string; requiresTwoFactor: boolean; twoFactorMethod: 'email' | 'totp' }> {
  const existingUser = await queryD1First(db, 'SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const userId = generateD1UUID();
  const passwordHash = await hashPassword(password);

  await executeD1(
    db,
    `INSERT INTO users (id, email, name, password_hash, role, two_factor_enabled, terms_accepted_at)
     VALUES (?, ?, ?, ?, 'user', 0, CURRENT_TIMESTAMP)`,
    [userId, email, name, passwordHash]
  );

  const challenge = await createEmailVerificationChallenge(db, { id: userId, email, role: 'user' }, options);
  return {
    twoFactorToken: challenge.twoFactorToken,
    requiresTwoFactor: true,
    twoFactorMethod: 'email',
  };
}

export async function loginD1(
  db: D1Database,
  email: string,
  password: string,
  options: AuthD1Options,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  user?: AuthUser;
  token?: string;
  twoFactorToken?: string;
  requiresTwoFactor?: boolean;
  twoFactorMethod?: 'email' | 'totp';
}> {
  const user = await queryD1First(db, 'SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
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
    throw new Error('Invalid credentials');
  }

  await executeD1(db, `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?`, [user.id]);

  if (!user.email_verified_at) {
    const challenge = await createEmailVerificationChallenge(db, user, options);
    return {
      requiresTwoFactor: true,
      twoFactorToken: challenge.twoFactorToken,
      twoFactorMethod: 'email',
    };
  }

  if (user.two_factor_enabled && user.two_factor_secret_encrypted && user.two_factor_confirmed_at) {
    const challenge = await createTotpChallenge(user, options.jwtSecret);
    return {
      requiresTwoFactor: true,
      twoFactorToken: challenge.twoFactorToken,
      twoFactorMethod: 'totp',
    };
  }

  const token = await generateAuthToken({ id: user.id, email: user.email, role: user.role }, options);
  return { user: toAuthUser(user), token };
}

export async function continueWithGoogleD1(
  db: D1Database,
  credential: string,
  role: 'user' | 'partner' | 'admin',
  options: AuthD1Options,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  user?: AuthUser;
  token?: string;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
  twoFactorMethod?: 'email' | 'totp';
}> {
  if (!options.googleClientId) {
    throw new Error('Google login is not configured');
  }

  const googleUser = await verifyGoogleCredential(credential, options.googleClientId);
  let user = await queryD1First(db, 'SELECT * FROM users WHERE email = ?', [googleUser.email]);

  if (!user) {
    const userId = generateD1UUID();
    const passwordHash = await hashPassword(generateSecureToken());
    await executeD1(
      db,
      `INSERT INTO users (id, email, name, password_hash, role, avatar_url, two_factor_enabled, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      [userId, googleUser.email, googleUser.name, passwordHash, role, googleUser.picture || null]
    );
    user = await queryD1First(db, 'SELECT * FROM users WHERE id = ?', [userId]);
  }

  if (!user.email_verified_at) {
    await executeD1(db, `UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
  }

  if (user.two_factor_enabled && user.two_factor_secret_encrypted && user.two_factor_confirmed_at) {
    const challenge = await createTotpChallenge(user, options.jwtSecret);
    return {
      requiresTwoFactor: true,
      twoFactorToken: challenge.twoFactorToken,
      twoFactorMethod: 'totp',
    };
  }

  const token = await generateAuthToken({ id: user.id, email: user.email, role: user.role }, options);
  return { user: toAuthUser(user), token };
}

export async function verifyTwoFactorD1(
  db: D1Database,
  twoFactorToken: string,
  code: string,
  options: AuthD1Options,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: AuthUser; token: string }> {
  const decoded = await verifyJwt(twoFactorToken, options.jwtSecret);
  if (decoded.purpose !== 'two_factor' && decoded.purpose !== 'email_verification') {
    throw new Error('Invalid two-factor token');
  }

  const user = await queryD1First(db, 'SELECT * FROM users WHERE id = ?', [decoded.id as string]);
  if (!user) {
    throw new Error('User not found');
  }

  if (decoded.purpose === 'email_verification' || decoded.method === 'email') {
    if (!user.two_factor_code_hash || !user.two_factor_code_expires_at) {
      throw new Error('Verification code has expired');
    }

    if (new Date() > new Date(user.two_factor_code_expires_at)) {
      throw new Error('Verification code has expired');
    }

    const isValidEmailCode = await comparePassword(code, user.two_factor_code_hash);
    if (!isValidEmailCode) {
      throw new Error('Invalid verification code');
    }

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
    if (!user.two_factor_enabled || !user.two_factor_secret_encrypted) {
      throw new Error('Two-factor authentication is not enabled');
    }

    const secret = await decryptSecret(user.two_factor_secret_encrypted, options.totpEncryptionKey);
    const isValidCode = await verifyTotpCode(secret, code);
    if (!isValidCode) {
      throw new Error('Invalid two-factor code');
    }

    await executeD1(db, `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
  }

  const authUser = toAuthUser(user);
  const token = await generateAuthToken({ id: user.id, email: user.email, role: user.role }, options);
  return { user: authUser, token };
}

export async function resendTwoFactorCodeD1(
  db: D1Database,
  twoFactorToken: string,
  options: AuthD1Options
): Promise<{ twoFactorToken: string }> {
  const decoded = await verifyJwt(twoFactorToken, options.jwtSecret);
  if (decoded.purpose !== 'email_verification' && decoded.method !== 'email') {
    throw new Error('This verification flow cannot resend email codes');
  }

  const user = await queryD1First(db, 'SELECT id, email, role FROM users WHERE id = ?', [decoded.id as string]);
  if (!user) {
    throw new Error('User not found');
  }

  return createEmailVerificationChallenge(db, user, options);
}

export async function getTwoFactorStatusD1(db: D1Database, userId: string) {
  const user = await queryD1First(
    db,
    `SELECT two_factor_enabled, two_factor_secret_encrypted, two_factor_confirmed_at FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) {
    throw new Error('User not found');
  }
  return {
    enabled: Boolean(user.two_factor_enabled && user.two_factor_confirmed_at),
    setup_started: Boolean(user.two_factor_secret_encrypted),
    confirmed_at: user.two_factor_confirmed_at,
  };
}

export async function setupTwoFactorD1(db: D1Database, userId: string, password: string, options: AuthD1Options) {
  const user = await queryD1First(db, 'SELECT id, email, password_hash FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  const secret = generateTotpSecret();
  const encryptedSecret = await encryptSecret(secret, options.totpEncryptionKey);

  await executeD1(
    db,
    `UPDATE users
     SET two_factor_enabled = 0,
         two_factor_secret_encrypted = ?,
         two_factor_confirmed_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [encryptedSecret, userId]
  );

  return {
    message: 'Scan this secret in your authenticator app, then confirm with a 6-digit code.',
    secret,
    otpauth_url: buildOtpAuthUrl(user.email, 'ClothCycle', secret),
  };
}

export async function enableTwoFactorD1(db: D1Database, userId: string, password: string, code: string, options: AuthD1Options) {
  const user = await queryD1First(db, 'SELECT password_hash, two_factor_secret_encrypted FROM users WHERE id = ?', [userId]);
  if (!user || !user.two_factor_secret_encrypted) {
    throw new Error('Start two-factor setup before enabling it');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  const secret = await decryptSecret(user.two_factor_secret_encrypted, options.totpEncryptionKey);
  const isValidCode = await verifyTotpCode(secret, code);
  if (!isValidCode) {
    throw new Error('Invalid two-factor code');
  }

  await executeD1(
    db,
    `UPDATE users
     SET two_factor_enabled = 1,
         two_factor_confirmed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [userId]
  );

  return {
    message: 'Two-factor authentication enabled',
    recovery_codes: [],
  };
}

export async function disableTwoFactorD1(db: D1Database, userId: string, password: string, code: string | undefined, options: AuthD1Options) {
  const user = await queryD1First(db, 'SELECT password_hash, two_factor_secret_encrypted, two_factor_enabled FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  if (user.two_factor_enabled && user.two_factor_secret_encrypted) {
    if (!code) {
      throw new Error('Two-factor code is required to disable 2FA');
    }
    const secret = await decryptSecret(user.two_factor_secret_encrypted, options.totpEncryptionKey);
    const isValidCode = await verifyTotpCode(secret, code);
    if (!isValidCode) {
      throw new Error('Invalid two-factor code');
    }
  }

  await executeD1(
    db,
    `UPDATE users
     SET two_factor_enabled = 0,
         two_factor_secret_encrypted = NULL,
         two_factor_confirmed_at = NULL,
         two_factor_code_hash = NULL,
         two_factor_code_expires_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [userId]
  );

  return { message: 'Two-factor authentication disabled' };
}

export async function forgotPasswordD1(db: D1Database, email: string, options: AuthD1Options) {
  const user = await queryD1First(db, 'SELECT id FROM users WHERE email = ?', [email]);
  const resetCode = generateNumericCode();
  const tokenHash = await hashToken(resetCode);

  if (user) {
    await executeD1(
      db,
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, datetime('now', '+30 minutes'))`,
      [generateD1UUID(), user.id, tokenHash]
    );

    if (options.emailProvider && options.emailApiKey && options.emailFrom) {
      const resetLink = options.appUrl ? `${options.appUrl}/reset-password?token=${resetCode}` : resetCode;
      await sendPasswordResetLink(options.emailProvider, options.emailApiKey, options.emailFrom, email, resetLink);
    }
  }

  const response: { message: string; reset_token?: string } = {
    message: 'If an account exists, a password reset email has been sent.',
  };

  if (options.exposeDevSecrets) {
    response.reset_token = resetCode;
  }

  return response;
}

export async function resetPasswordD1(db: D1Database, token: string, password: string) {
  const tokenHash = await hashToken(token.trim());
  const record = await queryD1First(
    db,
    `SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
    [tokenHash]
  );

  if (!record) {
    throw new Error('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(password);
  await executeD1(db, `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [passwordHash, record.user_id]);
  await executeD1(db, `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?`, [record.id]);

  return { message: 'Password reset successfully' };
}

export async function getProfileD1(db: D1Database, userId: string): Promise<AuthUser> {
  const user = await queryD1First(
    db,
    'SELECT id, email, name, role, avatar_url, bio, phone, address, two_factor_enabled, email_verified_at FROM users WHERE id = ?',
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
     RETURNING id, email, name, role, avatar_url, bio, phone, address, two_factor_enabled, email_verified_at`,
    [name, avatar_url, bio, phone, address, userId]
  );

  if (!result) {
    throw new Error('User not found');
  }

  return toAuthUser(result);
}

async function createEmailVerificationChallenge(
  db: D1Database,
  user: { id: string; email: string; role: string },
  options: AuthD1Options
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

  if (options.emailProvider && options.emailApiKey && options.emailFrom) {
    await sendTwoFactorCode(options.emailProvider, options.emailApiKey, options.emailFrom, user.email, code);
  }

  if (options.exposeDevSecrets) {
    console.log(`Dev email 2FA code for ${user.email}: ${code}`);
  }

  const twoFactorToken = await signJwt(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      purpose: 'email_verification',
      method: 'email',
    },
    options.jwtSecret
  );

  return { twoFactorToken };
}

async function createTotpChallenge(user: { id: string; email: string; role: string }, jwtSecret: string): Promise<{ twoFactorToken: string }> {
  const twoFactorToken = await signJwt(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      purpose: 'two_factor',
      method: 'totp',
    },
    jwtSecret
  );

  return { twoFactorToken };
}

async function generateAuthToken(payload: Record<string, unknown>, options: AuthD1Options) {
  return signJwt(payload, options.jwtSecret);
}

async function verifyGoogleCredential(credential: string, clientId: string) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );

  if (!response.ok) {
    throw new Error('Invalid Google credential');
  }

  const payload = (await response.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
  };

  if (payload.aud !== clientId) {
    throw new Error('Google credential audience mismatch');
  }

  if (!payload.email || payload.email_verified === false || payload.email_verified === 'false') {
    throw new Error('Google email is not verified');
  }

  return {
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
  };
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
