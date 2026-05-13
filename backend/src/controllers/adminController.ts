import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { hashPassword } from '../utils/auth.js';
import { AppError } from '../utils/errorHandler.js';

const allowedRoles = new Set(['user', 'partner', 'admin']);
const allowedStatuses = new Set(['active', 'inactive', 'suspended']);

function requireAdmin(req: Request) {
  if (req.user?.role !== 'admin') {
    throw new AppError(403, 'Only admins can access this endpoint');
  }
}

function normalizeRole(role?: string) {
  const normalized = (role || 'user').toLowerCase();
  if (!allowedRoles.has(normalized)) {
    throw new AppError(400, 'Invalid role');
  }
  return normalized;
}

function normalizeStatus(status?: string) {
  const normalized = (status || 'active').toLowerCase();
  if (!allowedStatuses.has(normalized)) {
    throw new AppError(400, 'Invalid status');
  }
  return normalized;
}

export const getAdminUsers = async (req: Request, res: Response) => {
  try {
    requireAdmin(req);
    const role = req.query.role ? normalizeRole(String(req.query.role)) : null;
    const params = role ? [role] : [];
    const where = role ? 'WHERE u.role = $1' : '';

    const result = await query(
      `SELECT
         u.id, u.email, u.name, u.role, u.status, u.avatar_url, u.bio,
         u.phone, u.address, u.partner_id, u.created_at, u.updated_at,
         p.name AS partner_name
       FROM users u
       LEFT JOIN partners p ON p.id = u.partner_id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    );

    res.json({ data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const createAdminUser = async (req: Request, res: Response) => {
  try {
    requireAdmin(req);
    const role = normalizeRole(req.body.role);
    const status = normalizeStatus(req.body.status);

    if (!req.body.name || !req.body.email) {
      throw new AppError(400, 'Name and email are required');
    }

    const password = req.body.password || `ClothCycle!${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await hashPassword(password);
    const id = uuidv4();

    const result = await query(
      `INSERT INTO users (
         id, email, name, password_hash, role, status, phone, address, partner_id
       )
       VALUES ($1, lower($2), $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, email, name, role, status, avatar_url, bio, phone, address, partner_id, created_at, updated_at`,
      [
        id,
        req.body.email,
        req.body.name,
        passwordHash,
        role,
        status,
        req.body.phone || null,
        req.body.address || null,
        req.body.partner_id || null,
      ]
    );

    res.status(201).json({ message: 'User created successfully', data: result.rows[0] });
  } catch (error) {
    const message = (error as any).code === '23505' ? 'Email is already in use' : (error as Error).message;
    res.status((error as AppError).statusCode || 400).json({ error: message });
  }
};

export const updateAdminUser = async (req: Request, res: Response) => {
  try {
    requireAdmin(req);
    const role = normalizeRole(req.body.role);
    const status = normalizeStatus(req.body.status);

    const result = await query(
      `UPDATE users
       SET name = $1,
           email = lower($2),
           role = $3,
           status = $4,
           phone = $5,
           address = $6,
           partner_id = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, email, name, role, status, avatar_url, bio, phone, address, partner_id, created_at, updated_at`,
      [
        req.body.name,
        req.body.email,
        role,
        status,
        req.body.phone || null,
        req.body.address || null,
        req.body.partner_id || null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    res.json({ message: 'User updated successfully', data: result.rows[0] });
  } catch (error) {
    const message = (error as any).code === '23505' ? 'Email is already in use' : (error as Error).message;
    res.status((error as AppError).statusCode || 400).json({ error: message });
  }
};

export const deleteAdminUser = async (req: Request, res: Response) => {
  try {
    requireAdmin(req);

    if (req.params.id === req.user?.id) {
      throw new AppError(400, 'You cannot delete your own account');
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};
