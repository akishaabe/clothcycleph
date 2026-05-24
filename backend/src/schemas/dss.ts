import { z } from 'zod';

export const sendDssRecommendationSchema = z.object({
  submission_id: z.string().uuid(),
  partner_id: z.string().uuid(),
  recommended_pathway: z.enum(['recycle', 'donate', 'upcycle']),
  buyback_interest: z.boolean().optional(),
  estimated_distance_km: z.coerce.number().nonnegative().max(50000).nullable().optional(),
  estimated_carbon_kg: z.coerce.number().nonnegative().max(50000).nullable().optional(),
  brief: z.string().trim().min(1).max(5000),
});

export const updateDssRequestStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'completed', 'rejected']),
  notes: z.string().trim().max(1000).optional(),
  outcome_title: z.string().trim().max(160).optional(),
  outcome_description: z.string().trim().max(2000).optional(),
  outcome_photos: z.array(z.string().url()).optional(),
});

export const remindDssRequestSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export const partnerRuleChangeRequestSchema = z.object({
  rule_area: z.string().trim().min(1).max(100),
  requested_change: z.string().trim().min(1).max(2000),
  reason: z.string().trim().max(1000).optional(),
});

export const partnerRuleChangeReplySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});
