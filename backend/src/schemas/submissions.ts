import { z } from 'zod';
import { uuidLikeStringSchema } from './common.js';

const photoSchema = z.union([
  z.string().url(),
  z.object({
    url: z.string().url(),
    label: z.string().trim().max(120).nullable().optional(),
    key: z.string().trim().max(500).nullable().optional(),
  }),
]);
const optionalStringArraySchema = z.array(z.string().trim().min(1)).default([]);
const nullableTrimmedStringSchema = z.string().trim().nullable().optional();

export const createSubmissionSchema = z.object({
  submission_name: z.string().trim().max(160).nullable().optional(),
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
  upcycle_request: z.string().trim().max(1000).nullable().optional(),
  scheduled_at: z.coerce.date().nullable().optional(),
  details: z
    .object({
      item_types: optionalStringArraySchema,
      other_item_type: nullableTrimmedStringSchema,
      condition: nullableTrimmedStringSchema,
      cleanliness: nullableTrimmedStringSchema,
      knows_fabric_type: z.boolean().nullable().optional(),
      fabric_types: optionalStringArraySchema,
      custom_fabric_text: nullableTrimmedStringSchema,
      fabric_identification: optionalStringArraySchema,
      brand: nullableTrimmedStringSchema,
      no_brand_visible: z.boolean().default(false),
      fabric_description: optionalStringArraySchema,
      restricted_category: z
        .enum([
          'hospital_medical_uniform',
          'ppe_contaminated_workwear',
          'used_undergarments',
          'mold_chemical_contaminated',
          'none',
        ])
        .default('none'),
      uniform_branding: nullableTrimmedStringSchema,
      fiber_composition: nullableTrimmedStringSchema,
      wearability: nullableTrimmedStringSchema,
      repairability: nullableTrimmedStringSchema,
      contamination_level: nullableTrimmedStringSchema,
      damage_classification: nullableTrimmedStringSchema,
      repurposing_potential: nullableTrimmedStringSchema,
      trim_removal: nullableTrimmedStringSchema,
      weight_value: z.coerce.number().positive().max(100000).nullable().optional(),
      weight_unit: z.enum(['kg', 'g']).default('kg').optional(),
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
}).superRefine((data, ctx) => {
  const hasQuantity = data.quantity != null && Number(data.quantity) > 0;
  const hasWeight = data.details?.weight_value != null && Number(data.details.weight_value) > 0;

  if (!hasQuantity && !hasWeight) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please provide either the quantity of items or the estimated weight.',
      path: ['quantity'],
    });
  }
});

export const updateSubmissionStatusSchema = z.object({
  status: z.enum(['pending', 'verified', 'processed', 'rejected']),
});

export const createTrackingUpdateSchema = z.object({
  request_id: uuidLikeStringSchema.nullable().optional(),
  progress_status: z.enum(['request_sent', 'scheduled', 'in_transit', 'dropoff_completed', 'completed']),
  fulfillment_method: z.enum(['drop_off', 'shipping', 'pickup', 'other']).default('drop_off').optional(),
  contact_name: z.string().trim().max(120).nullable().optional(),
  logistics_company: z.string().trim().max(160).nullable().optional(),
  tracking_number: z.string().trim().max(160).nullable().optional(),
  dropoff_scheduled_at: z.coerce.date().nullable().optional(),
  dropoff_location: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
