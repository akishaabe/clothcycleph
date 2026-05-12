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

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, name, password, role = 'user' } = req.body;

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
      `INSERT INTO users (id, email, name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, two_factor_enabled`,
      [userId, email, name, passwordHash, role]
    );

    const user = result.rows[0];
    const challenge = await createTwoFactorChallenge(user);

    res.status(201).json({
      message: 'User created successfully. Check your email for your verification code.',
      requiresTwoFactor: true,
      two_factor_token: challenge.twoFactorToken,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    // Get user
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      throw new AppError(401, 'Invalid credentials');
    }

    const user = result.rows[0];

    // Compare password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid credentials');
    }

    const challenge = await createTwoFactorChallenge(user);

    return res.json({
      message: 'Two-factor verification required. Check your email for your verification code.',
      requiresTwoFactor: true,
      two_factor_token: challenge.twoFactorToken,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
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
        `INSERT INTO users (id, email, name, password_hash, role, avatar_url, two_factor_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [userId, googleUser.email, googleUser.name, passwordHash, role, googleUser.picture]
      );
    }

    const challenge = await createTwoFactorChallenge(userResult.rows[0]);

    res.json({
      message: 'Google account verified. Check your email for your verification code.',
      requiresTwoFactor: true,
      two_factor_token: challenge.twoFactorToken,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const verifyTwoFactor = async (req: Request, res: Response) => {
  try {
    const { two_factor_token, code } = req.body;
    const decoded = verifyToken(two_factor_token);

    if (decoded.purpose !== 'two_factor') {
      throw new AppError(400, 'Invalid two-factor token');
    }

    const result = await query(
      `SELECT *
       FROM users
       WHERE id = $1
         AND two_factor_code_hash IS NOT NULL
         AND two_factor_code_expires_at > NOW()`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw new AppError(400, 'Two-factor code has expired');
    }

    const user = result.rows[0];
    const isValidCode = await comparePassword(code, user.two_factor_code_hash);

    if (!isValidCode) {
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

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        two_factor_enabled: user.two_factor_enabled,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const enableTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const code = generateNumericCode();
    const codeHash = await hashPassword(code);

    await query(
      `UPDATE users
       SET two_factor_enabled = true,
           two_factor_code_hash = $1,
           two_factor_code_expires_at = NOW() + INTERVAL '10 minutes'
       WHERE id = $2`,
      [codeHash, userId]
    );

    res.json({
      message: 'Two-factor authentication enabled',
      ...(shouldExposeDevSecrets() ? { dev_code: code } : {}),
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const disableTwoFactor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    await query(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_code_hash = NULL,
           two_factor_code_expires_at = NULL
       WHERE id = $1`,
      [userId]
    );

    res.json({ message: 'Two-factor authentication disabled' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length > 0) {
      const resetToken = generateSecureToken();
      const tokenHash = hashToken(resetToken);

      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [userResult.rows[0].id, tokenHash]
      );

      await sendPasswordResetLink(email, resetToken);

      return res.json({
        message: 'If an account exists, a password reset email has been sent.',
        ...(shouldExposeDevSecrets() ? { reset_token: resetToken } : {}),
      });
    }

    res.json({
      message: 'If an account exists, a password reset email has been sent.',
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

function shouldExposeDevSecrets() {
  return process.env.NODE_ENV !== 'production' && !config.email.resendApiKey;
}

async function createTwoFactorChallenge(user: { id: string; email: string; role: string }) {
  const code = generateNumericCode();
  const codeHash = await hashPassword(code);

  await query(
    `UPDATE users
     SET two_factor_enabled = true,
         two_factor_code_hash = $1,
         two_factor_code_expires_at = NOW() + INTERVAL '10 minutes'
     WHERE id = $2`,
    [codeHash, user.id]
  );

  await sendTwoFactorCode(user.email, code);

  const twoFactorToken = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    purpose: 'two_factor',
  });

  if (shouldExposeDevSecrets()) {
    console.log(`Dev 2FA code for ${user.email}: ${code}`);
  }

  return { twoFactorToken };
}

async function verifyGoogleCredential(credential: string) {
  if (!config.google.clientId) {
    throw new AppError(500, 'Google login is not configured');
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );

  if (!response.ok) {
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
    throw new AppError(401, 'Google credential audience mismatch');
  }

  if (!payload.email || payload.email_verified === false || payload.email_verified === 'false') {
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
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const tokenResult = await client.query(
      `SELECT *
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new AppError(400, 'Invalid or expired reset token');
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
    res.status(400).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      'SELECT id, email, name, role, avatar_url, bio, phone, address, two_factor_enabled, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, avatar_url, bio, phone, address } = req.body;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($2, name), 
           avatar_url = COALESCE($3, avatar_url),
           bio = COALESCE($4, bio),
           phone = COALESCE($5, phone),
           address = COALESCE($6, address),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, role, avatar_url, bio, phone, address, two_factor_enabled`,
      [userId, name, avatar_url, bio, phone, address]
    );

    res.json({
      message: 'Profile updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
