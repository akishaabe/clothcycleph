import { D1Database, generateD1UUID, queryD1, queryD1First, executeD1 } from '../config/d1.js';
import { hashPassword, comparePassword, generateSecureToken } from '../utils/workerAuth.js';
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
import {
  sendTwoFactorCode,
  sendPasswordResetLink,
  EmailProvider,
} from './workerEmailService.js';

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
  two_factor_method?: 'email' | 'totp';
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;
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
): Promise<{ twoFactorToken: string; requiresTwoFactor: boolean; twoFactorMethod: 'email' | 'totp'; devCode?: string }> {
  const existingUser = await queryD1First(db, 'SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const userId = generateD1UUID();
  const passwordHash = await hashPassword(password);

  await executeD1(
    db,
    `INSERT INTO users (id, email, name, password_hash, role, two_factor_enabled, terms_accepted_at)
     VALUES (?, ?, ?, ?, 'user', 1, CURRENT_TIMESTAMP)`,
    [userId, email, name, passwordHash]
  );

  const challenge = await createEmailVerificationChallenge(db, { id: userId, email, role: 'user' }, options);
  return {
    twoFactorToken: challenge.twoFactorToken,
    requiresTwoFactor: true,
    twoFactorMethod: 'email',
    devCode: challenge.devCode,
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
  devCode?: string;
}> {
  const user = await queryD1First(db, 'SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    throw new Error('Account doesn\'t exist');
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
    throw new Error('Account doesn\'t exist');
  }

  assertAccountCanAuthenticate(user);

  await executeD1(db, `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?`, [user.id]);

  if (!user.email_verified_at) {
    const challenge = await createEmailVerificationChallenge(db, user, options);
    return {
      requiresTwoFactor: true,
      twoFactorToken: challenge.twoFactorToken,
      twoFactorMethod: 'email',
      devCode: challenge.devCode,
    };
  }

  if (isTwoFactorLoginRequired(user)) {
    const method = getLoginTwoFactorMethod(user);
    const challenge =
      method === 'email'
        ? await createEmailVerificationChallenge(db, user, options, 'two_factor')
        : await createTotpChallenge(user, options.jwtSecret);
    return {
      requiresTwoFactor: true,
      twoFactorToken: challenge.twoFactorToken,
      twoFactorMethod: method,
      devCode: (challenge as { devCode?: string }).devCode,
    };
  }

  const emailChallenge = await createEmailVerificationChallenge(db, user, options, 'two_factor');
  return {
    requiresTwoFactor: true,
    twoFactorToken: emailChallenge.twoFactorToken,
    twoFactorMethod: 'email',
    devCode: emailChallenge.devCode,
  };
}

export async function continueWithGoogleD1(
  db: D1Database,
  credential: string,
  _role: 'user' | 'partner' | 'admin',
  options: AuthD1Options,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  user?: AuthUser;
  token?: string;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
  twoFactorMethod?: 'email' | 'totp';
  devCode?: string;
}> {
  if (!options.googleClientId) {
    throw new Error('Google login is not configured');
  }

  const googleUser = await verifyGoogleCredential(credential, options.googleClientId);
  let user = await queryD1First(db, 'SELECT * FROM users WHERE email = ?', [googleUser.email]);

  if (!user) {
    throw new Error('No account found for this Google email. Please sign up first before logging in.');
  }

  assertAccountCanAuthenticate(user);

  if (!user.email_verified_at) {
    await executeD1(db, `UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
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

  assertAccountCanAuthenticate(user);

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
): Promise<{ twoFactorToken: string; twoFactorMethod: 'email'; devCode?: string }> {
  const decoded = await verifyJwt(twoFactorToken, options.jwtSecret);
  if (decoded.purpose !== 'email_verification' && decoded.method !== 'email') {
    throw new Error('This verification flow cannot resend codes');
  }

  const user = await queryD1First(db, 'SELECT id, email, role FROM users WHERE id = ?', [decoded.id as string]);
  if (!user) {
    throw new Error('User not found');
  }

  const challenge = await createEmailVerificationChallenge(
    db,
    user,
    options,
    decoded.purpose === 'email_verification' ? 'email_verification' : 'two_factor'
  );
  return { ...challenge, twoFactorMethod: 'email' };
}

export async function getTwoFactorStatusD1(db: D1Database, userId: string) {
  const user = await queryD1First(
    db,
    `SELECT two_factor_enabled, two_factor_method, two_factor_secret_encrypted, two_factor_confirmed_at, phone FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) {
    throw new Error('User not found');
  }
  return {
    enabled: isTwoFactorLoginRequired(user),
    method: user.two_factor_method || 'email',
    setup_started: Boolean(user.two_factor_secret_encrypted),
    confirmed_at: user.two_factor_confirmed_at,
    phone: user.phone,
  };
}

export async function setupTwoFactorD1(
  db: D1Database,
  userId: string,
  password: string,
  options: AuthD1Options,
  method: 'email' | 'totp' = 'email'
) {
  const user = await queryD1First(db, 'SELECT id, email, phone, password_hash FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  if (method === 'email') {
    await executeD1(
      db,
      `UPDATE users
       SET two_factor_enabled = 1,
           two_factor_method = 'email',
           two_factor_secret_encrypted = NULL,
           two_factor_confirmed_at = CURRENT_TIMESTAMP,
           two_factor_code_hash = NULL,
           two_factor_code_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [userId]
    );

    return {
      message: 'Email verification selected as your sign-in method.',
      method: 'email' as const,
      recovery_codes: [],
    };
  }

  const secret = generateTotpSecret();
  const encryptedSecret = await encryptSecret(secret, options.totpEncryptionKey);

  await executeD1(
    db,
    `UPDATE users
     SET two_factor_enabled = 1,
         two_factor_method = 'totp',
         two_factor_secret_encrypted = ?,
         two_factor_confirmed_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [encryptedSecret, userId]
  );

  return {
    message: 'Scan this secret in your authenticator app, then confirm with a 6-digit code.',
    method: 'totp' as const,
    secret,
    otpauth_url: buildOtpAuthUrl(user.email, 'ClothCycle', secret),
  };
}

export async function enableTwoFactorD1(db: D1Database, userId: string, password: string, code: string, options: AuthD1Options) {
  const user = await queryD1First(db, 'SELECT password_hash, two_factor_method, two_factor_secret_encrypted, two_factor_code_hash, two_factor_code_expires_at FROM users WHERE id = ?', [userId]);
  if (!user || !user.two_factor_secret_encrypted) {
    throw new Error('Start two-factor setup before enabling it');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  const isValidCode = await verifyTotpCode(await decryptSecret(user.two_factor_secret_encrypted, options.totpEncryptionKey), code);
  if (!isValidCode) {
    throw new Error('Invalid two-factor code');
  }

  await executeD1(
    db,
    `UPDATE users
     SET two_factor_enabled = 1,
         two_factor_confirmed_at = CURRENT_TIMESTAMP,
         two_factor_code_hash = NULL,
         two_factor_code_expires_at = NULL,
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
  const user = await queryD1First(db, 'SELECT password_hash, two_factor_method, two_factor_secret_encrypted, two_factor_enabled, two_factor_code_hash, two_factor_code_expires_at FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  if (user.two_factor_enabled) {
    if (!code) {
      throw new Error('Two-factor code is required to disable 2FA');
    }
    const isValidCode = await verifyTotpCode(await decryptSecret(user.two_factor_secret_encrypted, options.totpEncryptionKey), code);
    if (!isValidCode) {
      throw new Error('Invalid two-factor code');
    }
  }

  await executeD1(
    db,
    `UPDATE users
     SET two_factor_enabled = 1,
         two_factor_method = 'email',
         two_factor_secret_encrypted = NULL,
         two_factor_confirmed_at = CURRENT_TIMESTAMP,
         two_factor_code_hash = NULL,
         two_factor_code_expires_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [userId]
  );

  return { message: 'Email verification selected as your sign-in method' };
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

export async function verifyResetCodeD1(db: D1Database, token: string) {
  const tokenHash = await hashToken(token.trim());
  const record = await queryD1First(
    db,
    `SELECT id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
    [tokenHash]
  );

  if (!record) {
    throw new Error('Invalid or expired reset code');
  }

  return { message: 'Reset code is valid' };
}

export async function getUsersD1(db: D1Database, role?: string) {
  let sql = `SELECT u.*, p.name AS partner_name FROM users u LEFT JOIN partners p ON u.partner_id = p.id`;
  const params: unknown[] = [];

  if (role) {
    sql += ' WHERE lower(u.role) = lower(?)';
    params.push(role);
  }

  sql += ' ORDER BY u.created_at DESC';

  const result = await queryD1(db, sql, params);
  return {
    ...result,
    results: result.results?.map(normalizeUser),
  };
}

export async function createUserD1(
  db: D1Database,
  payload: {
    name: string;
    email: string;
    role: 'user' | 'partner' | 'admin';
    status?: 'active' | 'inactive' | 'suspended';
    phone?: string | null;
    address?: string | null;
    partner_id?: string | null;
    password?: string | null;
  }
) {
  const existingUser = await queryD1First(db, 'SELECT id FROM users WHERE email = ?', [payload.email]);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const userId = generateD1UUID();
  const passwordHash = await hashPassword(
    payload.password || generateSecureToken()
  );

  await executeD1(
    db,
    `INSERT INTO users (id, email, name, password_hash, role, status, partner_id, phone, address, two_factor_enabled, terms_accepted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
    [
      userId,
      payload.email,
      payload.name,
      passwordHash,
      payload.role,
      payload.status || 'active',
      payload.partner_id || null,
      payload.phone || null,
      payload.address || null,
    ]
  );

  const user = await queryD1First(
    db,
    `SELECT u.*, p.name AS partner_name FROM users u LEFT JOIN partners p ON u.partner_id = p.id WHERE u.id = ?`,
    [userId]
  );

  return normalizeUser(user);
}

export async function updateUserD1(
  db: D1Database,
  userId: string,
  payload: {
    name?: string;
    email?: string;
    role?: 'user' | 'partner' | 'admin';
    status?: 'active' | 'inactive' | 'suspended';
    phone?: string | null;
    address?: string | null;
    partner_id?: string | null;
  }
) {
  const existingUser = await queryD1First(db, 'SELECT id FROM users WHERE id = ?', [userId]);
  if (!existingUser) {
    throw new Error('User not found');
  }

  await executeD1(
    db,
    `UPDATE users
     SET name = ?,
         email = ?,
         role = ?,
         status = ?,
         phone = ?,
         address = ?,
         partner_id = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      payload.name || null,
      payload.email || null,
      payload.role || 'user',
      payload.status || 'active',
      payload.phone || null,
      payload.address || null,
      payload.partner_id || null,
      userId,
    ]
  );

  const user = await queryD1First(
    db,
    `SELECT u.*, p.name AS partner_name FROM users u LEFT JOIN partners p ON u.partner_id = p.id WHERE u.id = ?`,
    [userId]
  );

  return normalizeUser(user);
}

export async function deleteUserD1(db: D1Database, userId: string, deletedByUserId?: string) {
  const user = await queryD1First(db, 'SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User not found');
  }
  try {
    const { password_hash, ...snapshot } = user;
    await executeD1(
      db,
      `INSERT INTO deleted_records (id, entity_type, entity_id, snapshot, deleted_by_user_id)
       VALUES (?, 'user', ?, ?, ?)`,
      [generateD1UUID(), userId, JSON.stringify(snapshot), deletedByUserId || null]
    );
  } catch (error) {
    console.warn('Unable to archive deleted user record:', error);
  }
  const result = await executeD1(db, 'DELETE FROM users WHERE id = ?', [userId]);
  if (!result) {
    throw new Error('User not found');
  }
  return { message: 'User deleted' };
}

export async function deleteOwnAccountD1(db: D1Database, userId: string, password: string) {
  const user = await queryD1First(db, 'SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  try {
    const { password_hash, ...snapshot } = user;
    await executeD1(
      db,
      `INSERT INTO deleted_records (id, entity_type, entity_id, snapshot, deleted_by_user_id)
       VALUES (?, 'user_account_self_delete', ?, ?, ?)`,
      [generateD1UUID(), userId, JSON.stringify(snapshot), userId]
    );
  } catch (error) {
    console.warn('Unable to archive deleted account record:', error);
  }

  await executeD1(db, 'DELETE FROM users WHERE id = ?', [userId]);
  return { message: 'Account deleted successfully' };
}

function normalizeUser(row: any) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    read: undefined,
    partner_name: row.partner_name,
  };
}

export async function getProfileD1(db: D1Database, userId: string): Promise<AuthUser> {
  const user = await queryD1First(
    db,
    'SELECT id, email, name, role, avatar_url, profile_photo, bio, phone, address, two_factor_enabled, two_factor_method, email_verified_at, created_at, updated_at FROM users WHERE id = ?',
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
  updates: {
    name?: string;
    email?: string;
    avatar_url?: string | null;
    bio?: string | null;
    phone?: string | null;
    address?: string | null;
    password?: string;
  }
): Promise<AuthUser> {
  const { name, email, avatar_url, bio, phone, address, password } = updates;
  const currentUser = await queryD1First(db, 'SELECT email, phone, password_hash FROM users WHERE id = ?', [userId]);
  if (!currentUser) {
    throw new Error('User not found');
  }

  const isSensitiveChange =
    (email && email !== currentUser.email) ||
    (phone !== undefined && phone !== currentUser.phone);

  if (isSensitiveChange) {
    if (!password) {
      throw new Error('Password is required to change email or phone number');
    }

    const isValidPassword = await comparePassword(password, currentUser.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }
  }

  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(updates, 'avatar_url');
  const profilePhoto =
    hasAvatarUrl && avatar_url
      ? JSON.stringify({ url: avatar_url, updated_at: new Date().toISOString() })
      : null;

  const result = await queryD1First(
    db,
    `UPDATE users
     SET name = COALESCE(?, name),
         email = COALESCE(?, email),
         avatar_url = CASE WHEN ? THEN ? ELSE avatar_url END,
         profile_photo = CASE WHEN ? THEN ? ELSE profile_photo END,
         bio = COALESCE(?, bio),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
     RETURNING id, email, name, role, avatar_url, profile_photo, bio, phone, address, two_factor_enabled, two_factor_method, email_verified_at, created_at, updated_at`,
    [
      name,
      email,
      hasAvatarUrl,
      avatar_url,
      hasAvatarUrl,
      profilePhoto,
      bio,
      phone,
      address,
      userId,
    ]
  );

  if (!result) {
    throw new Error('User not found');
  }

  return toAuthUser(result);
}

export async function changePasswordD1(
  db: D1Database,
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await queryD1First(db, 'SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await comparePassword(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid current password');
  }

  const passwordHash = await hashPassword(newPassword);
  await executeD1(db, 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    passwordHash,
    userId,
  ]);

  return { message: 'Password changed successfully' };
}

async function createEmailVerificationChallenge(
  db: D1Database,
  user: { id: string; email: string; role: string },
  options: AuthD1Options,
  purpose: 'email_verification' | 'two_factor' = 'email_verification'
): Promise<{ twoFactorToken: string; devCode?: string }> {
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
      purpose,
      method: 'email',
    },
    options.jwtSecret
  );

  return { twoFactorToken, devCode: options.exposeDevSecrets ? code : undefined };
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

function getLoginTwoFactorMethod(user: any): 'email' | 'totp' {
  if (user.two_factor_method === 'totp' && user.two_factor_secret_encrypted && user.two_factor_confirmed_at) {
    return 'totp';
  }

  if (user.two_factor_method === 'email') {
    return 'email';
  }

  return 'email';
}

function isTwoFactorLoginRequired(user: any): boolean {
  return true;
}

function assertAccountCanAuthenticate(user: any) {
  const status = String(user?.status || 'active').toLowerCase();

  if (status === 'suspended') {
    throw new Error('Your account has been suspended. Please contact support or the administrator.');
  }

  if (['deactivated', 'deleted', 'inactive'].includes(status)) {
    throw new Error('Your account is not active. Please contact support or the administrator.');
  }
}

async function generateAuthToken(payload: Record<string, unknown>, options: AuthD1Options) {
  return signJwt(payload, options.jwtSecret);
}

async function verifyGoogleCredential(credential: string, clientId: string) {
  let response: Response;
  try {
    response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { signal: AbortSignal.timeout(10000) }
    );
  } catch (error) {
    console.error('Google credential verification network error', {
      message: (error as Error).message,
      name: (error as Error).name,
    });
    throw new Error('Could not contact Google to verify the sign-in credential');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Google credential verification rejected', {
      status: response.status,
      statusText: response.statusText,
      body: errorText.slice(0, 300),
    });
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
    console.error('Google credential audience mismatch', {
      expectedClientIdPrefix: clientId.slice(0, 12),
      receivedAudiencePrefix: payload.aud?.slice(0, 12),
    });
    throw new Error('Google credential audience mismatch');
  }

  if (!payload.email || payload.email_verified === false || payload.email_verified === 'false') {
    console.error('Google credential email not verified or missing', {
      hasEmail: Boolean(payload.email),
      emailVerified: payload.email_verified,
    });
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
    avatar_url: user.avatar_url || getProfilePhotoUrl(user.profile_photo),
    bio: user.bio,
    phone: user.phone,
    address: user.address,
    two_factor_enabled: isTwoFactorLoginRequired(user),
    two_factor_method: user.two_factor_method || 'email',
    email_verified_at: user.email_verified_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function getProfilePhotoUrl(profilePhoto: unknown) {
  if (!profilePhoto) {
    return null;
  }

  if (typeof profilePhoto === 'object' && 'url' in profilePhoto) {
    const url = (profilePhoto as { url?: unknown }).url;
    return typeof url === 'string' ? url : null;
  }

  if (typeof profilePhoto !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(profilePhoto);
    return parsed && typeof parsed.url === 'string' ? parsed.url : null;
  } catch {
    return null;
  }
}
