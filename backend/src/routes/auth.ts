import { Router } from 'express';
import {
  signup,
  login,
  getProfile,
  updateProfile,
  verifyTwoFactor,
  resendTwoFactorCode,
  setupTwoFactor,
  getTwoFactorStatus,
  enableTwoFactor,
  disableTwoFactor,
  forgotPassword,
  resetPassword,
  continueWithGoogle,
  changePassword,
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
  twoFactorResendSchema,
  twoFactorSetupSchema,
  twoFactorEnableSchema,
  twoFactorDisableSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../schemas/auth.js';

const router = Router();

// Public routes
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/google', validate(googleAuthSchema), continueWithGoogle);
router.post('/2fa/verify', validate(twoFactorVerifySchema), verifyTwoFactor);
router.post('/2fa/resend', validate(twoFactorResendSchema), resendTwoFactorCode);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);
router.put('/password', authMiddleware, validate(changePasswordSchema), changePassword);
router.get('/2fa/status', authMiddleware, getTwoFactorStatus);
router.get('/2fa/setup', authMiddleware, setupTwoFactor);
router.post('/2fa/setup', authMiddleware, validate(twoFactorSetupSchema), setupTwoFactor);
router.post('/2fa/enable', authMiddleware, validate(twoFactorEnableSchema), enableTwoFactor);
router.post('/2fa/disable', authMiddleware, validate(twoFactorDisableSchema), disableTwoFactor);

export default router;
