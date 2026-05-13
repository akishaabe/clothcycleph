import { z } from 'zod';

const photoSchema = z.union([z.string().url(), z.record(z.unknown())]);
const optionalStringArraySchema = z.array(z.string().trim().min(1)).default([]);
const nullableTrimmedStringSchema = z.string().trim().nullable().optional();

export const createSubmissionSchema = z.object({
  item_type: z.string().trim().min(1).max(100),
  condition: z.string().trim().min(1).max(100),
  fabric: z.string().trim().max(100).nullable().optional(),
  cleanliness: z.string().trim().max(100).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  photos: z.array(photoSchema).default([]),
  service_type: z.enum(['recycle', 'donate', 'upcycle', 'buyback']).nullable().optional(),
  quantity: z.coerce.number().int().positive().nullable().optional(),
  buyback_interest: z.boolean().default(false),
  action: z.string().trim().max(100).nullable().optional(),
  scheduled_at: z.coerce.date().nullable().optional(),
  details: z
    .object({
      item_types: optionalStringArraySchema,
      other_item_type: nullableTrimmedStringSchema,
      condition: nullableTrimmedStringSchema,
      cleanliness: nullableTrimmedStringSchema,
      knows_fabric_type: z.boolean().nullable().optional(),
      fabric_types: optionalStringArraySchema,
      fabric_identification: optionalStringArraySchema,
      brand: nullableTrimmedStringSchema,
      no_brand_visible: z.boolean().default(false),
      fabric_description: optionalStringArraySchema,
    })
    .optional(),
  burn_test: z
    .object({
      performed: z.boolean().default(false),
      page: z.coerce.number().int().positive().nullable().optional(),
      moment: optionalStringArraySchema,
      flames: optionalStringArraySchema,
      no_flame: optionalStringArraySchema,
      smell: nullableTrimmedStringSchema,
      ashes: optionalStringArraySchema,
    })
    .optional(),
});

export const updateSubmissionStatusSchema = z.object({
  status: z.enum(['pending', 'verified', 'processed', 'rejected']),
});
