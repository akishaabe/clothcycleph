import { z } from 'zod';

const photoSchema = z.union([z.string().url(), z.record(z.unknown())]);

export const createSubmissionSchema = z.object({
  item_type: z.string().trim().min(1).max(100),
  condition: z.string().trim().min(1).max(100),
  fabric: z.string().trim().max(100).nullable().optional(),
  cleanliness: z.string().trim().max(100).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  photos: z.array(photoSchema).default([]),
});

export const updateSubmissionStatusSchema = z.object({
  status: z.enum(['pending', 'verified', 'processed', 'rejected']),
});
