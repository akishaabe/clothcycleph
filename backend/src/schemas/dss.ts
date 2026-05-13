import { z } from 'zod';

export const sendDssRecommendationSchema = z.object({
  submission_id: z.string().uuid(),
  partner_id: z.string().uuid(),
  recommended_pathway: z.enum(['recycle', 'donate', 'upcycle', 'buyback']),
  brief: z.string().trim().min(1).max(5000),
});

export const updateDssRequestStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'completed']),
  notes: z.string().trim().max(1000).optional(),
});

export const remindDssRequestSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});
