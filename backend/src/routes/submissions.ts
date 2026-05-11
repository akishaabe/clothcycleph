import { Router } from 'express';
import {
  createSubmission,
  getUserSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
} from '../controllers/submissionController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../schemas/common.js';
import { createSubmissionSchema, updateSubmissionStatusSchema } from '../schemas/submissions.js';

const router = Router();

// All submission routes require authentication
router.post('/', authMiddleware, validate(createSubmissionSchema), createSubmission);
router.get('/', authMiddleware, getUserSubmissions);
router.get('/:id', authMiddleware, validate(uuidParamSchema, 'params'), getSubmissionById);
router.put(
  '/:id/status',
  authMiddleware,
  validate(uuidParamSchema, 'params'),
  validate(updateSubmissionStatusSchema),
  updateSubmissionStatus
);

export default router;
