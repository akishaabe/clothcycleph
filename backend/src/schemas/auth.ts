import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  name: z.string().trim().min(1).max(255),
  password: z.string().min(6).max(128),
  role: z.enum(['user', 'partner', 'admin']).default('user'),
});

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  avatar_url: z.string().url().max(500).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
});
