import type { HttpRequest as Request, HttpResponse as Response, UploadedFile } from '../types/http.js';
import { query } from '../config/database.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadToR2 } from '../services/r2Service.js';

type MessageAttachmentInput = {
  filename: string;
  url: string;
  key?: string;
  mimetype?: string;
  size?: number;
};

export interface FileRequest extends Request {
  file?: UploadedFile;
}

const MAX_MESSAGE_ATTACHMENT_SIZE = 50 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
]);

type MessageUser = {
  id: string;
  role: string;
};

export const getMessageContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT id, name, email, role, COALESCE(avatar_url, profile_photo->>'url') AS avatar_url
       FROM users
       WHERE id <> $1
         AND (
           ($2 = 'user' AND role = 'partner')
           OR (
             $2 = 'partner'
             AND role = 'user'
             AND EXISTS (
               SELECT 1
               FROM messages m
               WHERE m.from_user_id = users.id
                 AND m.to_user_id = $1
               LIMIT 1
             )
           )
           OR ($2 = 'admin' AND role = 'admin')
         )
       ORDER BY
         CASE role
           WHEN 'partner' THEN 1
           WHEN 'user' THEN 2
           ELSE 3
         END,
         name ASC`,
      [userId, role]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { to_user_id, content, attachments = [] } = req.body;
    const fromUserId = req.user?.id;
    const normalizedContent = typeof content === 'string' ? content.trim() : '';
    const normalizedAttachments = normalizeAttachmentInputs(attachments);

    if (!fromUserId) {
      throw new AppError(401, 'User not authenticated');
    }

    if (!to_user_id || (!normalizedContent && normalizedAttachments.length === 0)) {
      throw new AppError(400, 'Recipient and message content or attachment are required');
    }

    if (to_user_id === fromUserId) {
      throw new AppError(400, 'You cannot send a message to yourself');
    }

    const [sender, recipient] = await Promise.all([
      getMessageUser(fromUserId),
      getMessageUser(to_user_id),
    ]);

    if (!recipient) {
      throw new AppError(404, 'Recipient not found');
    }

    if (!sender || !(await canDirectMessage(sender, recipient))) {
      throw new AppError(403, getMessageLimitMessage(sender?.role, recipient.role));
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO messages (id, from_user_id, to_user_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        id,
        fromUserId,
        to_user_id,
        normalizedContent || `Sent an attachment: ${normalizedAttachments[0]?.filename}`,
      ]
    );

    for (const attachment of normalizedAttachments) {
      await query(
        `INSERT INTO message_attachments (id, message_id, filename, url, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          uuidv4(),
          id,
          attachment.filename,
          attachment.url,
          JSON.stringify({
            key: attachment.key || null,
            mimetype: attachment.mimetype || null,
            size: attachment.size || null,
          }),
        ]
      );

      await query(
        `UPDATE uploaded_files
         SET related_entity_type = 'message',
             related_entity_id = $1,
             purpose = 'message_attachment',
             updated_at = NOW()
         WHERE url = $2`,
        [id, attachment.url]
      ).catch((error) => {
        console.warn('Unable to link uploaded message attachment metadata:', error);
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        ...result.rows[0],
        attachments: normalizedAttachments.map((attachment) => ({
          id: null,
          filename: attachment.filename,
          url: attachment.url,
          metadata: {
            key: attachment.key || null,
            mimetype: attachment.mimetype || null,
            size: attachment.size || null,
          },
        })),
      },
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const uploadMessageAttachment = async (req: FileRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    if (!req.file) {
      throw new AppError(400, 'No file provided');
    }

    validateMessageAttachment(req.file);

    let url: string;
    let key: string;

    try {
      if (
        config.server.env === 'development' &&
        (!config.r2.accountId || !config.r2.accessKeyId || !config.r2.secretAccessKey)
      ) {
        throw new Error('R2 is not configured for local development');
      }

      const uploaded = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      url = uploaded.url;
      key = uploaded.key;
    } catch (uploadError) {
      if (config.server.env !== 'development') {
        throw uploadError;
      }

      const extension = path.extname(req.file.originalname) || mimeToExtension(req.file.mimetype);
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
      const uploadDir = path.resolve(process.cwd(), 'uploads', 'messages');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, safeName), req.file.buffer);
      key = `local/messages/${safeName}`;
      url = `${req.protocol || 'http'}://${req.get?.('host') || 'localhost:5000'}/uploads/messages/${safeName}`;
    }

    await recordUploadedFile({
      userId,
      storageKey: key,
      url,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      sizeBytes: req.file.size,
      purpose: 'message_attachment',
    });

    res.status(201).json({
      message: 'Attachment uploaded successfully',
      attachment: {
        filename: req.file.originalname,
        url,
        key,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    res.status(400).json({ error: (error as Error).message });
  }
};

async function recordUploadedFile(payload: {
  userId: string;
  storageKey: string;
  url: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  purpose: string;
}) {
  try {
    await query(
      `INSERT INTO uploaded_files (
         user_id, storage_key, url, original_name, content_type, size_bytes, purpose
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        payload.userId,
        payload.storageKey,
        payload.url,
        payload.originalName,
        payload.contentType,
        payload.sizeBytes,
        payload.purpose,
      ]
    );
  } catch (error) {
    console.warn('Unable to record uploaded attachment metadata:', error);
  }
}

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      throw new AppError(401, 'User not authenticated');
    }

    if (userId === currentUserId) {
      throw new AppError(400, 'You cannot open a conversation with yourself');
    }

    const [currentUser, otherUser] = await Promise.all([
      getMessageUser(currentUserId),
      getMessageUser(userId),
    ]);

    if (!otherUser) {
      throw new AppError(404, 'Conversation user not found');
    }

    if (!currentUser || !(await canDirectMessage(currentUser, otherUser))) {
      throw new AppError(403, getMessageLimitMessage(currentUser?.role, otherUser.role));
    }

    await query(
      `UPDATE messages
       SET read = true
       WHERE from_user_id = $1 AND to_user_id = $2 AND read = false`,
      [userId, currentUserId]
    );

    const result = await query(
      `SELECT m.*,
              COALESCE(attachments.items, '[]'::json) AS attachments
       FROM messages m
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', ma.id,
             'filename', ma.filename,
             'url', ma.url,
             'metadata', ma.metadata,
             'uploaded_at', ma.uploaded_at
           )
           ORDER BY ma.uploaded_at ASC
         ) AS items
         FROM message_attachments ma
         WHERE ma.message_id = m.id
       ) attachments ON true
       WHERE (from_user_id = $1 AND to_user_id = $2) 
          OR (from_user_id = $2 AND to_user_id = $1)
       ORDER BY m.created_at ASC`,
      [currentUserId, userId]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

function normalizeAttachmentInputs(value: unknown): MessageAttachmentInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 5)
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const attachment = item as Partial<MessageAttachmentInput>;
      if (!attachment.filename || !attachment.url) {
        return null;
      }

      return {
        filename: String(attachment.filename),
        url: String(attachment.url),
        key: attachment.key ? String(attachment.key) : undefined,
        mimetype: attachment.mimetype ? String(attachment.mimetype) : undefined,
        size: Number.isFinite(Number(attachment.size)) ? Number(attachment.size) : undefined,
      };
    })
    .filter(Boolean) as MessageAttachmentInput[];
}

function validateMessageAttachment(file: UploadedFile) {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowed = ALLOWED_ATTACHMENT_MIMES.has(file.mimetype) || ALLOWED_ATTACHMENT_EXTENSIONS.has(extension);

  if (!allowed) {
    throw new AppError(400, 'Only images, PDF, Word, and Excel files are allowed');
  }

  if (file.size > MAX_MESSAGE_ATTACHMENT_SIZE) {
    throw new AppError(400, 'Message attachments must be 50MB or smaller');
  }
}

function mimeToExtension(mimetype: string) {
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/gif') return '.gif';
  if (mimetype === 'image/heic') return '.heic';
  if (mimetype === 'image/heif') return '.heif';
  if (mimetype === 'application/pdf') return '.pdf';
  if (mimetype === 'application/msword') return '.doc';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  if (mimetype === 'application/vnd.ms-excel') return '.xls';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '.xlsx';
  return '.jpg';
}

export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `WITH scoped_messages AS (
         SELECT
           m.*,
           CASE
             WHEN m.from_user_id = $1 THEN m.to_user_id
             ELSE m.from_user_id
           END AS other_user_id
         FROM messages m
         WHERE (m.from_user_id = $1 OR m.to_user_id = $1)
           AND m.from_user_id <> m.to_user_id
       ),
       ranked_messages AS (
         SELECT
           sm.*,
           ROW_NUMBER() OVER (
             PARTITION BY sm.other_user_id
             ORDER BY sm.created_at DESC
           ) AS row_number
         FROM scoped_messages sm
       )
       SELECT
         rm.other_user_id,
         u.name AS other_user_name,
         u.email AS other_user_email,
         u.role AS other_user_role,
         COALESCE(u.avatar_url, u.profile_photo->>'url') AS other_user_avatar_url,
         rm.content AS last_message_content,
         rm.from_user_id AS last_message_from_user_id,
         rm.created_at AS last_message_time,
         COALESCE(unread.unread_count, 0) AS unread_count
       FROM ranked_messages rm
       JOIN users u ON u.id = rm.other_user_id
       LEFT JOIN (
         SELECT from_user_id, COUNT(*) AS unread_count
         FROM messages
         WHERE to_user_id = $1 AND read = false
         GROUP BY from_user_id
       ) unread ON unread.from_user_id = rm.other_user_id
       WHERE rm.row_number = 1
         AND rm.other_user_id <> $1
         AND (
           ($2 = 'user' AND u.role = 'partner')
           OR (
             $2 = 'partner'
             AND u.role = 'user'
             AND EXISTS (
               SELECT 1
               FROM messages starter
               WHERE starter.from_user_id = u.id
                 AND starter.to_user_id = $1
               LIMIT 1
             )
           )
           OR ($2 = 'admin' AND u.role = 'admin')
         )
       ORDER BY rm.created_at DESC`,
      [userId, role]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getUnreadMessageCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT COUNT(*)::int AS unread_count
       FROM messages m
       JOIN users sender ON sender.id = m.from_user_id
       WHERE m.to_user_id = $1
         AND m.read = false
         AND (
           ($2 = 'user' AND sender.role = 'partner')
           OR ($2 = 'partner' AND sender.role = 'user')
           OR ($2 = 'admin' AND sender.role = 'admin')
         )`,
      [userId, role]
    );

    res.json({ unread_count: result.rows[0]?.unread_count || 0 });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

async function getMessageUser(userId: string): Promise<MessageUser | null> {
  const result = await query('SELECT id, role FROM users WHERE id = $1', [userId]);
  return result.rows[0] || null;
}

async function canDirectMessage(sender: MessageUser, recipient: MessageUser) {
  if (sender.id === recipient.id) {
    return false;
  }

  if (sender.role === 'admin' || recipient.role === 'admin') {
    return sender.role === 'admin' && recipient.role === 'admin';
  }

  if (sender.role === 'user') {
    return recipient.role === 'partner';
  }

  if (sender.role === 'partner' && recipient.role === 'user') {
    const result = await query(
      `SELECT 1
       FROM messages
       WHERE from_user_id = $1 AND to_user_id = $2
       LIMIT 1`,
      [recipient.id, sender.id]
    );
    return result.rows.length > 0;
  }

  return false;
}

function getMessageLimitMessage(senderRole?: string, recipientRole?: string) {
  if (recipientRole === 'admin' || senderRole === 'admin') {
    return 'Admins can only use direct messages with other admins. Partner-admin updates are sent through notifications.';
  }

  if (senderRole === 'partner') {
    return 'Partners can reply only after a user has started the conversation.';
  }

  return 'This direct message is not allowed for these account roles.';
}

export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `UPDATE messages
       SET read = true
       WHERE id = $1 AND to_user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Message not found');
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
