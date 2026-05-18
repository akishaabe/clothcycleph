import { z } from 'zod';

export const sendDssRecommendationSchema = z.object({
  submission_id: z.string().uuid(),
  partner_id: z.string().uuid(),
  recommended_pathway: z.enum(['recycle', 'donate', 'upcycle', 'buyback']),
  brief: z.string().trim().min(1).max(5000),
});

export const updateDssRequestStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'completed', 'rejected']),
  notes: z.string().trim().max(1000).optional(),
});

export const remindDssRequestSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export const partnerRuleChangeRequestSchema = z.object({
  rule_area: z.string().trim().min(1).max(100),
  requested_change: z.string().trim().min(1).max(2000),
  reason: z.string().trim().max(1000).optional(),
});
