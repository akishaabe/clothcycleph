import { z } from 'zod';

export const createTransactionSchema = z.object({
  submission_id: z.string().uuid(),
  to_partner_id: z.string().uuid(),
  type: z.enum(['recycle', 'donate', 'upcycle', 'buyback']),
  amount: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateTransactionStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected']),
  notes: z.string().max(1000).optional(),
});
