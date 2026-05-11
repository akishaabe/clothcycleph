import { Router } from 'express';
import { signup, login, getProfile, updateProfile } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, signupSchema, updateProfileSchema } from '../schemas/auth.js';

const router = Router();

// Public routes
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);

export default router;
