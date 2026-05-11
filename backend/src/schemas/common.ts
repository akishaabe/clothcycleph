import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});
