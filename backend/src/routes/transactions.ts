import { Router } from 'express';
import {
  createTransaction,
  getTransactionsBySubmission,
  getTransactionsByUser,
  getTransactionsByPartner,
  updateTransactionStatus,
} from '../controllers/transactionController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { partnerIdParamSchema, submissionIdParamSchema, uuidParamSchema } from '../schemas/common.js';
import { createTransactionSchema, updateTransactionStatusSchema } from '../schemas/transactions.js';

const router = Router();

// Transaction creation (admin/partner only)
router.post('/', authMiddleware, requireRole('admin', 'partner'), validate(createTransactionSchema), createTransaction);

// Get transactions by submission
router.get('/submission/:submissionId', authMiddleware, validate(submissionIdParamSchema, 'params'), getTransactionsBySubmission);

// Get transactions for current user
router.get('/user', authMiddleware, getTransactionsByUser);

// Get transactions for a partner
router.get('/partner/:partnerId', authMiddleware, validate(partnerIdParamSchema, 'params'), getTransactionsByPartner);

// Update transaction status
router.put('/:id', authMiddleware, validate(uuidParamSchema, 'params'), validate(updateTransactionStatusSchema), updateTransactionStatus);

export default router;
