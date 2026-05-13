import { Router } from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/uploadController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Upload route (protected)
router.post('/', authMiddleware, upload.single('file'), uploadFile);

export default router;
