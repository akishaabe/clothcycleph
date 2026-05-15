import { Request, Response } from 'express';
import { getClient, query } from '../config/database.js';
import { AppError } from '../utils/errorHandler.js';
import {
  generateToken,
  hashPassword,
  comparePassword,
  generateNumericCode,
  generateSecureToken,
  hashToken,
  verifyToken,
} from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { sendPasswordResetLink, sendTwoFactorCode } from '../services/emailService.js';
import {
  buildRateLimitKey,
  checkRateLimit,
  clearRateLimit,
  recordAuthEvent,
  replaceRecoveryCodes,
  useRecoveryCode,
} from '../services/authSecurityService.js';
import {
  buildOtpAuthUrl,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  verifyTotpCode,
} from '../utils/totp.js';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    // Validate input
    if (!email || !name || !password) {
      throw new AppError(400, 'Email, name, and password are required');
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new AppError(400, 'User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    const result = await query(
      `INSERT INTO users (
         id,
         email,
         name,
         password_hash,
         role,
         two_factor_enabled,
         terms_accepted_at
       )
       VALUES ($1, $2, $3, $4, 'user', false, NOW())
       RETURNING id, email, name, role, two_factor_enabled, two_factor_confirmed_at, email_verified_at`,
      [userId, email, name, passwordHash]
    );

    const user = result.rows[0];
    const challenge = await createEmailVerificationChallenge(user);
    await recordAuthEvent({
      userId: user.id,
      eventType: 'signup_created',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      message: 'User created successfully. Check your email for your verification code.',
      requiresTwoFactor: true,
      two_factor_token: challenge.twoFactorToken,
      two_factor_method: 'email',
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const rateLimitKey = buildRateLimitKey('login', `${req.ip}:${email}`);
    const rateLimit = await checkRateLimit(rateLimitKey, 8, 15 * 60);

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
      throw new AppError(429, 'Too many login attempts. Please try again later.');
    }

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    // Get user
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      throw new AppError(401, 'Invalid credentials');
    }

    const user = result.rows[0];

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      throw new AppError(423, 'Account is temporarily locked. Please try again later.');
    }

    // Compare password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      await query(
        `UPDATE users
         SET failed_login_count = COALESCE(failed_login_count, 0) + 1,
             locked_until = CASE
               WHEN COALESCE(failed_login_count, 0) + 1 >= 10 THEN NOW() + INTERVAL '15 minutes'
               ELSE locked_until
             END
         WHERE id = $1`,
        [user.id]
      );
      await recordAuthEvent({
        userId: user.id,
        eventType: 'login_failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw new AppError(401, 'Invalid credentials');
    }

    await query(
      `UPDATE users
       SET failed_login_count = 0,
           locked_until = NULL
       WHERE id = $1`,
      [user.id]
    );
    await clearRateLimit(rateLimitKey);

    if (!user.email_verified_at) {
      const challenge = await createEmailVerificationChallenge(user);

      return res.json({
        message: 'Email verification required. Check your email for your verification code.',
        requiresTwoFactor: true,
        two_factor_token: challenge.twoFactorToken,
        two_factor_method: 'email',
      });
    }

    if (isTwoFactorLoginRequired(user)) {
      const method = getLoginTwoFactorMethod(user);
      const challenge =
        method === 'email'
          ? await createEmailVerificationChallenge(user, 'two_factor')
          : method === 'sms'
            ? await createSmsChallenge(user)
            : createTotpChallenge(user);

      return res.json({
        message:
          method === 'email'
            ? 'Two-factor verification required. Check your email for your verification code.'
            : method === 'sms'
              ? 'Two-factor verification required. Check your phone for your verification code.'
              : 'Two-factor verification required. Enter your authenticator code.',
        requiresTwoFactor: true,
        two_factor_token: challenge.twoFactorToken,
        two_factor_method: method,
      });
    }

    const emailChallenge = await createEmailVerificationChallenge(user, 'two_factor');
    return res.json({
      message: 'Two-factor verification required. Check your email for your verification code.',
      requiresTwoFactor: true,
      two_factor_token: emailChallenge.twoFactorToken,
      two_factor_method: 'email',
    });

  } catch (error) {
    sendAuthError(res, error);
  }
};

export const continueWithGoogle = async (req: Request, res: Response) => {
  try {
    const { credential, role = 'user' } = req.body;
    const googleUser = await verifyGoogleCredential(credential);

    let userResult = await query('SELECT * FROM users WHERE email = $1', [googleUser.email]);

    if (userResult.rows.length === 0) {
      const userId = uuidv4();
      const passwordHash = await hashPassword(generateSecureToken());

      userResult = await query(
        `INSERT INTO users (id, email, name, password_hash, role, avatar_url, two_factor_enabled, email_verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
         RETURNING *`,
        [userId, googleUser.email, googleUser.name, passwordHash, role, googleUser.picture]
      );
    } else if (!userResult.rows[0].email_verified_at) {
      userResult = await query(
        `UPDATE users
         SET email_verified_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [userResult.rows[0].id]
      );
    }

    const user = userResult.rows[0];

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    await recordAuthEvent({
      userId: user.id,
      eventType: 'google_login_success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      user: toAuthUser(user),
      token,
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const verifyTwoFactor = async (req: Request, res: Response) => {
  try {
    const { two_factor_token, code } = req.body;
    const rateLimitKey = buildRateLimitKey('2fa', `${req.ip}:${two_factor_token.slice(0, 24)}`);
    const rateLimit = await checkRateLimit(rateLimitKey, 8, 10 * 60);

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
      throw new AppError(429, 'Too many verification attempts. Please try again later.');
    }

    const decoded = verifyToken(two_factor_token);

    if (decoded.purpose !== 'two_factor' && decoded.purpose !== 'email_verification') {
      throw new AppError(400, 'Invalid two-factor token');
    }

    const result = await query(
      `SELECT *,
              two_factor_code_expires_at > NOW() AS two_factor_code_is_valid
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw new AppError(400, 'User not found');
    }

    const user = result.rows[0];

    if (decoded.purpose === 'email_verification' || decoded.method === 'email') {
      if (!user.two_factor_code_hash || !user.two_factor_code_is_valid) {
        throw new AppError(400, 'Verification code has expired');
      }

      const isValidEmailCode = await comparePassword(code, user.two_factor_code_hash);

      if (!isValidEmailCode) {
        await recordAuthEvent({
          userId: user.id,
          eventType: 'email_verification_failed',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError(401, 'Invalid verification code');
      }

      await query(
        `UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, NOW()),
             two_factor_code_hash = NULL,
             two_factor_code_expires_at = NULL,
             last_login_at = NOW()
         WHERE id = $1`,
        [user.id]
      );
    } else if (decoded.method === 'sms') {
      if (!user.two_factor_code_hash || !user.two_factor_code_is_valid) {
        throw new AppError(400, 'Verification code has expired');
      }

      const isValidSmsCode = await comparePassword(code, user.two_factor_code_hash);

      if (!isValidSmsCode) {
        await recordAuthEvent({
          userId: user.id,
          eventType: 'two_factor_failed',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError(401, 'Invalid two-factor code');
      }

      await query(
        `UPDATE users
         SET two_factor_code_hash = NULL,
             two_factor_code_expires_at = NULL,
             last_login_at = NOW()
         WHERE id = $1`,
        [user.id]
      );
    } else {
      if (!user.two_factor_enabled || !user.two_factor_secret_encrypted || !user.two_factor_confirmed_at) {
        throw new AppError(400, 'Two-factor authentication is not enabled');
      }

      const secret = decryptSecret(user.two_factor_secret_encrypted);
      const isValidCode = verifyTotpCode(secret, code) || (await useRecoveryCode(user.id, code));

      if (!isValidCode) {
        await recordAuthEvent({
          userId: user.id,
          eventType: 'two_factor_failed',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError(401, 'Invalid two-factor code');
      }

      await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    }

    await clearRateLimit(rateLimitKey);
    await recordAuthEvent({
      userId: user.id,
      eventType: decoded.purpose === 'email_verification' ? 'email_verified' : 'two_factor_success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      user: toAuthUser({
        ...user,
        email_verified_at: user.email_verified_at || new Date().toISOString(),
      }),
      token,
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const resendTwoFactorCode = async (req: Request, res: Response) => {
  try {
    const { two_factor_token } = req.body;
    const decoded = verifyToken(two_factor_token);

    if (decoded.purpose !== 'email_verification' && decoded.method !== 'email' && decoded.method !== 'sms') {
      throw new AppError(400, 'This verification flow cannot resend codes');
    }

    const result = await query(
      `SELECT id, email, role, phone
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const user = result.rows[0];
    const isSms = decoded.method === 'sms';
    const challenge = isSms
      ? await createSmsChallenge(user)
      : await createEmailVerificationChallenge(
          user,
          decoded.purpose === 'email_verification' ? 'email_verification' : 'two_factor'
        );

    await recordAuthEvent({
      userId: user.id,
      eventType: isSms ? 'two_factor_sms_resent' : 'email_verification_resent',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: isSms
        ? 'A new verification code has been prepared for SMS two-factor authentication.'
        : 'A new verification code has been sent to your email.',
      requiresTwoFactor: true,
      two_factor_token: challenge.twoFactorToken,
      two_factor_method: isSms ? 'sms' : 'email',
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const sendAuthenticatedSmsTwoFactorCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT id, email, role, phone, two_factor_enabled, two_factor_method
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const user = result.rows[0];
    if (!user.two_factor_enabled || user.two_factor_method !== 'sms') {
      throw new AppError(400, 'SMS two-factor authentication is not enabled');
    }

    if (!user.phone) {
      throw new AppError(400, 'A phone number is required for SMS two-factor authentication');
    }

    const code = generateNumericCode();
    const codeHash = await hashPassword(code);

    await query(
      `UPDATE users
       SET two_factor_code_hash = $1,
           two_factor_code_expires_at = NOW() + INTERVAL '10 minutes'
       WHERE id = $2`,
      [codeHash, user.id]
    );

    if (shouldExposeDevSecrets()) {
      console.log(`Dev SMS 2FA code for ${user.email}: ${code}`);
    }

    res.json({
      message: 'A verification code has been prepared for SMS two-factor authentication.',
      ...(shouldExposeDevSecrets() ? { dev_code: code } : {}),
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const getTwoFactorStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT two_factor_enabled, two_factor_method, two_factor_secret_encrypted, two_factor_confirmed_at, phone
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const user = result.rows[0];

    res.json({
      enabled: isTwoFactorLoginRequired(user),
      method: user.two_factor_method || 'totp',
      setup_started: Boolean(user.two_factor_secret_encrypted || user.two_factor_method === 'sms'),
      confirmed_at: user.two_factor_confirmed_at,
      phone: user.phone,
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const setupTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { password, method = 'totp' } = req.body;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    if (req.method === 'GET') {
      return res.json({
        message: 'Two-factor setup is available. Send a POST request with your current password to begin.',
      });
    }

    const result = await query('SELECT id, email, phone, password_hash FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const user = result.rows[0];
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid password');
    }

    if (!user.phone) {
      throw new AppError(400, 'Add a phone number in your profile settings before setting up two-factor authentication');
    }

    if (method === 'sms') {
      const recoveryCodes = await replaceRecoveryCodes(userId);

      await query(
        `UPDATE users
         SET two_factor_enabled = true,
             two_factor_method = 'sms',
             two_factor_secret_encrypted = NULL,
             two_factor_confirmed_at = NOW(),
             two_factor_code_hash = NULL,
             two_factor_code_expires_at = NULL
         WHERE id = $1`,
        [userId]
      );

      await recordAuthEvent({
        userId,
        eventType: 'two_factor_enabled',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.json({
        message: 'SMS two-factor authentication enabled',
        method: 'sms',
        recovery_codes: recoveryCodes,
      });
    }

    const secret = generateTotpSecret();
    const encryptedSecret = encryptSecret(secret);

    await query(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_method = 'totp',
           two_factor_secret_encrypted = $1,
           two_factor_confirmed_at = NULL
       WHERE id = $2`,
      [encryptedSecret, userId]
    );

    await recordAuthEvent({
      userId,
      eventType: 'two_factor_setup_started',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: 'Scan this secret in your authenticator app, then confirm with a 6-digit code.',
      secret,
      otpauth_url: buildOtpAuthUrl(user.email, secret),
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const enableTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { code, password, method = 'totp' } = req.body;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT password_hash, phone, two_factor_secret_encrypted
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0 || (method !== 'sms' && !result.rows[0].two_factor_secret_encrypted)) {
      throw new AppError(400, 'Start two-factor setup before enabling it');
    }

    const isValidPassword = await comparePassword(password, result.rows[0].password_hash);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid password');
    }

    if (!result.rows[0].phone) {
      throw new AppError(400, 'Add a phone number in your profile settings before setting up two-factor authentication');
    }

    if (method === 'sms') {
      const recoveryCodes = await replaceRecoveryCodes(userId);

      await query(
        `UPDATE users
         SET two_factor_enabled = true,
             two_factor_method = 'sms',
             two_factor_secret_encrypted = NULL,
             two_factor_confirmed_at = NOW(),
             two_factor_code_hash = NULL,
             two_factor_code_expires_at = NULL
         WHERE id = $1`,
        [userId]
      );

      await recordAuthEvent({
        userId,
        eventType: 'two_factor_enabled',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.json({
        message: 'SMS two-factor authentication enabled',
        recovery_codes: recoveryCodes,
      });
    }

    const secret = decryptSecret(result.rows[0].two_factor_secret_encrypted);

    if (!verifyTotpCode(secret, code)) {
      await recordAuthEvent({
        userId,
        eventType: 'two_factor_enable_failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw new AppError(401, 'Invalid two-factor code');
    }

    const recoveryCodes = await replaceRecoveryCodes(userId);

    await query(
      `UPDATE users
       SET two_factor_enabled = true,
           two_factor_method = 'totp',
           two_factor_confirmed_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    await recordAuthEvent({
      userId,
      eventType: 'two_factor_enabled',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: 'Two-factor authentication enabled',
      recovery_codes: recoveryCodes,
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const disableTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { code, password } = req.body;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT password_hash, two_factor_secret_encrypted, two_factor_enabled
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const user = result.rows[0];
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid password');
    }

    if (user.two_factor_enabled && user.two_factor_secret_encrypted) {
      if (!code) {
        throw new AppError(400, 'Two-factor code is required to disable 2FA');
      }

      const secret = decryptSecret(user.two_factor_secret_encrypted);
      const isValidCode = verifyTotpCode(secret, code) || (await useRecoveryCode(userId, code));

      if (!isValidCode) {
        throw new AppError(401, 'Invalid two-factor code');
      }
    }

    await query(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_secret_encrypted = NULL,
           two_factor_confirmed_at = NULL,
           two_factor_code_hash = NULL,
           two_factor_code_expires_at = NULL
       WHERE id = $1`,
      [userId]
    );
    await query('DELETE FROM user_recovery_codes WHERE user_id = $1', [userId]);
    await recordAuthEvent({
      userId,
      eventType: 'two_factor_disabled',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Two-factor authentication disabled' });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length > 0) {
      const resetCode = generateNumericCode();
      const tokenHash = hashToken(resetCode);

      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [userResult.rows[0].id, tokenHash]
      );

      await sendPasswordResetLink(email, resetCode);

      return res.json({
        message: 'If an account exists, a password reset email has been sent.',
        ...(shouldExposeDevSecrets() ? { reset_token: resetCode } : {}),
      });
    }

    res.json({
      message: 'If an account exists, a password reset email has been sent.',
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

function shouldExposeDevSecrets() {
  return process.env.NODE_ENV !== 'production' && config.email.provider === 'console';
}

async function createEmailVerificationChallenge(
  user: { id: string; email: string; role: string },
  purpose: 'email_verification' | 'two_factor' = 'email_verification'
) {
  const code = generateNumericCode();
  const codeHash = await hashPassword(code);

  await query(
    `UPDATE users
     SET two_factor_code_hash = $1,
         two_factor_code_expires_at = NOW() + INTERVAL '10 minutes'
     WHERE id = $2`,
    [codeHash, user.id]
  );

  await sendTwoFactorCode(user.email, code);

  const twoFactorToken = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    purpose,
    method: 'email',
  });

  if (shouldExposeDevSecrets()) {
    console.log(`Dev email 2FA code for ${user.email}: ${code}`);
  }

  return { twoFactorToken };
}

function createTotpChallenge(user: { id: string; email: string; role: string }) {
  const twoFactorToken = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    purpose: 'two_factor',
    method: 'totp',
  });

  return { twoFactorToken };
}

function getLoginTwoFactorMethod(user: any): 'email' | 'sms' | 'totp' {
  if (user.two_factor_method === 'email' || user.two_factor_method === 'sms') {
    return user.two_factor_method;
  }

  return 'totp';
}

function isTwoFactorLoginRequired(user: any): boolean {
  if (!user.two_factor_enabled) {
    return false;
  }

  if (user.two_factor_method === 'email') {
    return true;
  }

  if (user.two_factor_method === 'sms') {
    return Boolean(user.two_factor_confirmed_at);
  }

  return Boolean(user.two_factor_secret_encrypted && user.two_factor_confirmed_at);
}

async function createSmsChallenge(user: { id: string; email: string; role: string; phone?: string | null }) {
  if (!user.phone) {
    throw new AppError(400, 'A phone number is required for SMS two-factor authentication');
  }

  const code = generateNumericCode();
  const codeHash = await hashPassword(code);

  await query(
    `UPDATE users
     SET two_factor_code_hash = $1,
         two_factor_code_expires_at = NOW() + INTERVAL '10 minutes'
     WHERE id = $2`,
    [codeHash, user.id]
  );

  if (shouldExposeDevSecrets()) {
    console.log(`Dev SMS 2FA code for ${user.email}: ${code}`);
  }

  const twoFactorToken = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    purpose: 'two_factor',
    method: 'sms',
  });

  return { twoFactorToken };
}

function toAuthUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar_url: user.avatar_url,
    bio: user.bio,
    phone: user.phone,
    address: user.address,
    two_factor_enabled: isTwoFactorLoginRequired(user),
    two_factor_method: user.two_factor_method,
    email_verified_at: user.email_verified_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function verifyGoogleCredential(credential: string) {
  if (!config.google.clientId) {
    console.error('Google auth configuration missing: GOOGLE_CLIENT_ID is not set');
    throw new AppError(500, 'Google login is not configured');
  }

  let response: globalThis.Response;
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
    throw new AppError(502, 'Could not contact Google to verify the sign-in credential');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Google credential verification rejected', {
      status: response.status,
      statusText: response.statusText,
      body: errorText.slice(0, 300),
    });
    throw new AppError(401, 'Invalid Google credential');
  }

  const payload = (await response.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
  };

  if (payload.aud !== config.google.clientId) {
    console.error('Google credential audience mismatch', {
      expectedClientIdPrefix: config.google.clientId.slice(0, 12),
      receivedAudiencePrefix: payload.aud?.slice(0, 12),
    });
    throw new AppError(401, 'Google credential audience mismatch');
  }

  if (!payload.email || payload.email_verified === false || payload.email_verified === 'false') {
    console.error('Google credential email not verified or missing', {
      hasEmail: Boolean(payload.email),
      emailVerified: payload.email_verified,
    });
    throw new AppError(401, 'Google email is not verified');
  }

  return {
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
  };
}

export const resetPassword = async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const { code, token, password } = req.body;
    const resetCode = (code || token).trim();
    const tokenHash = hashToken(resetCode);

    const tokenResult = await client.query(
      `SELECT *
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new AppError(400, 'Invalid or expired reset code');
    }

    const passwordHash = await hashPassword(password);
    const resetRecord = tokenResult.rows[0];

    await client.query('BEGIN');
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           two_factor_code_hash = NULL,
           two_factor_code_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, resetRecord.user_id]
    );
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1`,
      [resetRecord.id]
    );
    await client.query('COMMIT');

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    sendAuthError(res, error);
  } finally {
    client.release();
  }
};

export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { code, token } = req.body;
    const resetCode = (code || token).trim();
    const tokenHash = hashToken(resetCode);

    const tokenResult = await query(
      `SELECT id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new AppError(400, 'Invalid or expired reset code');
    }

    res.json({ message: 'Reset code verified' });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      'SELECT id, email, name, role, avatar_url, profile_photo, bio, phone, address, two_factor_enabled, email_verified_at, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, email, avatar_url, bio, phone, address, password } = req.body;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const currentResult = await query('SELECT * FROM users WHERE id = $1', [userId]);

    if (currentResult.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const currentUser = currentResult.rows[0];
    const isSensitiveChange =
      (email && email !== currentUser.email) ||
      (phone !== undefined && phone !== currentUser.phone);

    if (isSensitiveChange) {
      if (!password) {
        throw new AppError(400, 'Password is required to change email or phone number');
      }

      const isValidPassword = await comparePassword(password, currentUser.password_hash);
      if (!isValidPassword) {
        throw new AppError(401, 'Invalid password');
      }
    }

    const hasAvatarUrl = Object.prototype.hasOwnProperty.call(req.body, 'avatar_url');
    const profilePhoto =
      hasAvatarUrl && avatar_url
        ? JSON.stringify({ url: avatar_url, updated_at: new Date().toISOString() })
        : null;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($2, name), 
           email = COALESCE($3, email),
           avatar_url = CASE WHEN $4 THEN $5 ELSE avatar_url END,
           profile_photo = CASE WHEN $4 THEN $6::jsonb ELSE profile_photo END,
           bio = COALESCE($7, bio),
           phone = COALESCE($8, phone),
           address = COALESCE($9, address),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, role, avatar_url, profile_photo, bio, phone, address, two_factor_enabled, created_at, updated_at`,
      [
        userId,
        name,
        email,
        hasAvatarUrl,
        avatar_url,
        profilePhoto,
        bio,
        phone,
        address,
      ]
    );

    res.json({
      message: 'Profile updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { current_password, new_password } = req.body;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const isValidPassword = await comparePassword(current_password, result.rows[0].password_hash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid current password');
    }

    const passwordHash = await hashPassword(new_password);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      userId,
    ]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const deleteOwnAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { password } = req.body || {};

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    if (!password) {
      throw new AppError(400, 'Password is required to delete your account');
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const isValidPassword = await comparePassword(password, result.rows[0].password_hash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid password');
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    sendAuthError(res, error);
  }
};

function sendAuthError(res: Response, error: unknown) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  return res.status(400).json({ error: (error as Error).message });
}
