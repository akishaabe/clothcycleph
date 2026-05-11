import { Router } from 'express';
import {
  getMessageContacts,
  sendMessage,
  getMessages,
  getConversations,
  markMessageAsRead,
} from '../controllers/messageController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { userIdParamSchema, uuidParamSchema } from '../schemas/common.js';
import { sendMessageSchema } from '../schemas/messages.js';

const router = Router();

// All message routes require authentication
router.get('/contacts', authMiddleware, getMessageContacts);
router.post('/', authMiddleware, validate(sendMessageSchema), sendMessage);
router.get('/conversations', authMiddleware, getConversations);
router.get('/:userId', authMiddleware, validate(userIdParamSchema, 'params'), getMessages);
router.put('/:id/read', authMiddleware, validate(uuidParamSchema, 'params'), markMessageAsRead);

export default router;
