import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'partner' | 'admin';
  };
}

// Permission definitions
type Permission =
  | 'create_submission'
  | 'view_submission'
  | 'update_submission'
  | 'delete_submission'
  | 'approve_submission'
  | 'reject_submission'
  | 'view_messages'
  | 'send_message'
  | 'view_users'
  | 'manage_users'
  | 'view_analytics'
  | 'manage_partners'
  | 'upload_files';

// Role-based permissions matrix
const rolePermissions: Record<string, Permission[]> = {
  user: [
    'create_submission',
    'view_submission',
    'update_submission',
    'view_messages',
    'send_message',
    'upload_files',
  ],
  partner: [
    'view_submission',
    'approve_submission',
    'reject_submission',
    'view_messages',
    'send_message',
    'view_analytics',
    'upload_files',
  ],
  admin: [
    'create_submission',
    'view_submission',
    'update_submission',
    'delete_submission',
    'approve_submission',
    'reject_submission',
    'view_messages',
    'send_message',
    'view_users',
    'manage_users',
    'view_analytics',
    'manage_partners',
    'upload_files',
  ],
};

/**
 * Middleware to check if user is authenticated
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError(401, 'No token provided');
    }

    const { verifyToken } = await import('../utils/auth.js');
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

/**
 * Middleware to check if user has specific role(s)
 */
export const requireRole = (...roles: Array<'user' | 'partner' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required_roles: roles,
        user_role: req.user.role,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has specific permission(s)
 */
export const requirePermission = (...permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userPermissions = rolePermissions[req.user.role] || [];
    const hasPermission = permissions.some((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required_permissions: permissions,
        user_permissions: userPermissions,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource (for resource-level access control)
 */
export const requireOwnership = (resourceIdParam = 'id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Allow admins to bypass ownership check
    if (req.user.role === 'admin') {
      return next();
    }

    const { query } = await import('../config/database.js');
    const resourceId = req.params[resourceIdParam];

    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID not provided' });
    }

    try {
      // Check submission ownership
      if (req.baseUrl.includes('/submissions')) {
        const result = await query('SELECT user_id FROM submissions WHERE id = $1', [resourceId]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Resource not found' });
        }

        if (result.rows[0].user_id !== req.user.id) {
          return res.status(403).json({ error: 'You do not own this resource' });
        }
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to rate limit by user (basic implementation)
 * For production, use a proper rate limiting library like express-rate-limit
 */
export const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userRequests = requests.get(userId)!;

    if (now > userRequests.resetTime) {
      userRequests.count = 1;
      userRequests.resetTime = now + windowMs;
      return next();
    }

    userRequests.count++;

    if (userRequests.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
      });
    }

    next();
  };
};

/**
 * Get all available permissions for a role
 */
export function getPermissionsForRole(role: 'user' | 'partner' | 'admin'): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: 'user' | 'partner' | 'admin', permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
}
