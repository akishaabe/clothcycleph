import { Router } from 'express';
import {
  createSubmission,
  getUserSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
} from '../controllers/submissionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All submission routes require authentication
router.post('/', authMiddleware, createSubmission);
router.get('/', authMiddleware, getUserSubmissions);
router.get('/:id', authMiddleware, getSubmissionById);
router.put('/:id/status', authMiddleware, updateSubmissionStatus);

export default router;
