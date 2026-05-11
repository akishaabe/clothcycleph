import { Router } from 'express';
import {
  sendMessage,
  getMessages,
  getConversations,
  markMessageAsRead,
} from '../controllers/messageController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All message routes require authentication
router.post('/', authMiddleware, sendMessage);
router.get('/conversations', authMiddleware, getConversations);
router.get('/:userId', authMiddleware, getMessages);
router.put('/:id/read', authMiddleware, markMessageAsRead);

export default router;
