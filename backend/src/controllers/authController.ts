import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { AppError } from '../utils/errorHandler.js';
import { generateToken, hashPassword, comparePassword } from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

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
       RETURNING id, email, name, role`,
      [userId, email, name, passwordHash, role]
    );

    const user = result.rows[0];
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      message: 'User created successfully',
      user,
      token,
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

    // Generate token
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
      },
      token,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      'SELECT id, email, name, role, avatar_url, bio, phone, address, created_at FROM users WHERE id = $1',
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
       RETURNING id, email, name, role, avatar_url, bio, phone, address`,
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
