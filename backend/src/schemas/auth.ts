import { z } from 'zod';

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/\d/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol');

export const signupSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  name: z.string().trim().min(1).max(255),
  password: strongPasswordSchema,
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
  method: z.enum(['totp']).optional(),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1).max(128),
  code: z.string().trim().min(6).max(32).optional(),
});

export const twoFactorSetupSchema = z.object({
  password: z.string().min(1).max(128),
  method: z.enum(['email', 'totp']).default('email'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Reset code must be 6 digits').optional(),
  token: z.string().trim().regex(/^\d{6}$/, 'Reset code must be 6 digits').optional(),
  password: strongPasswordSchema,
  confirm_password: strongPasswordSchema.optional(),
}).refine((data) => data.code || data.token, {
  message: 'Reset code is required',
  path: ['code'],
}).refine((data) => !data.confirm_password || data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const verifyResetCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Reset code must be 6 digits').optional(),
  token: z.string().trim().regex(/^\d{6}$/, 'Reset code must be 6 digits').optional(),
}).refine((data) => data.code || data.token, {
  message: 'Reset code is required',
  path: ['code'],
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
  role: z.literal('user').default('user'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  avatar_url: z.string().url().max(500).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  password: z.string().min(1).max(128).optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: strongPasswordSchema,
  confirm_password: strongPasswordSchema,
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
