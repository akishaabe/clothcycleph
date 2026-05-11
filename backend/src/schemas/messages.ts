import { z } from 'zod';

export const sendMessageSchema = z.object({
  to_user_id: z.string().uuid(),
  content: z.string().trim().min(1).max(5000),
});
