import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotificationById,
  getPreferences,
  updatePreferences,
} from '../controllers/notificationController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../schemas/common.js';

const router = Router();

// All notification routes require authentication
router.get('/', authMiddleware, getNotifications);
router.get('/count', authMiddleware, getUnreadCount);
router.get('/preferences', authMiddleware, getPreferences);
router.put('/preferences', authMiddleware, updatePreferences);
router.put('/:id/read', authMiddleware, validate(uuidParamSchema, 'params'), markAsRead);
router.put('/read-all', authMiddleware, markAllAsRead);
router.delete('/:id', authMiddleware, validate(uuidParamSchema, 'params'), deleteNotificationById);

export default router;
