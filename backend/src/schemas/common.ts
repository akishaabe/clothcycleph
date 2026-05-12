import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const submissionIdParamSchema = z.object({
  submissionId: z.string().uuid(),
});

export const partnerIdParamSchema = z.object({
  partnerId: z.string().uuid(),
});
