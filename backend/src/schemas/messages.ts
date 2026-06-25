import { z } from 'zod';
import { uuidLikeStringSchema } from './common.js';

const MAX_MESSAGE_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const messageAttachmentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  url: z.string().trim().min(1).max(2000),
  key: z.string().trim().max(1000).optional(),
  mimetype: z.string().trim().max(255).optional(),
  size: z.number().int().positive().max(MAX_MESSAGE_ATTACHMENT_SIZE).optional(),
});

export const sendMessageSchema = z.object({
  to_user_id: uuidLikeStringSchema,
  content: z.string().trim().max(5000).optional().default(''),
  attachments: z.array(messageAttachmentSchema).max(5).optional().default([]),
}).refine((data) => data.content.length > 0 || data.attachments.length > 0, {
  message: 'Message content or attachment is required',
  path: ['content'],
});
