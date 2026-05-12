import { Router } from 'express';
import {
  signup,
  login,
  getProfile,
  updateProfile,
  verifyTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  forgotPassword,
  resetPassword,
  continueWithGoogle,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  twoFactorVerifySchema,
  updateProfileSchema,
} from '../schemas/auth.js';

const router = Router();

// Public routes
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/google', validate(googleAuthSchema), continueWithGoogle);
router.post('/2fa/verify', validate(twoFactorVerifySchema), verifyTwoFactor);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);
router.post('/2fa/enable', authMiddleware, enableTwoFactor);
router.post('/2fa/disable', authMiddleware, disableTwoFactor);

export default router;
