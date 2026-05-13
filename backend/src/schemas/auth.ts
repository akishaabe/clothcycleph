import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  name: z.string().trim().min(1).max(255),
  password: z.string().min(6).max(128),
  role: z.literal('user').default('user'),
});

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const twoFactorVerifySchema = z.object({
  two_factor_token: z.string().min(1),
  code: z.string().trim().min(6).max(32),
});

export const twoFactorResendSchema = z.object({
  two_factor_token: z.string().min(1),
});

export const twoFactorEnableSchema = z.object({
  password: z.string().min(1).max(128),
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
  method: z.enum(['totp', 'sms']).optional(),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1).max(128),
  code: z.string().trim().min(6).max(32).optional(),
});

export const twoFactorSetupSchema = z.object({
  password: z.string().min(1).max(128),
  method: z.enum(['totp', 'sms']).default('totp'),
  phone: z.string().trim().max(20).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().regex(/^\d{6}$/, 'Reset code must be 6 digits'),
  password: z.string().min(6).max(128),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
  role: z.literal('user').default('user'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  avatar_url: z.string().url().max(500).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
});
