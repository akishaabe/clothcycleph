import { z } from 'zod';

export const uuidLikeStringSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID');

export const uuidParamSchema = z.object({
  id: uuidLikeStringSchema,
});

export const userIdParamSchema = z.object({
  userId: uuidLikeStringSchema,
});

export const submissionIdParamSchema = z.object({
  submissionId: uuidLikeStringSchema,
});

export const partnerIdParamSchema = z.object({
  partnerId: uuidLikeStringSchema,
});
