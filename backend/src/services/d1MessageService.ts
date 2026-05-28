import { D1Database, executeD1, queryD1, queryD1First, generateD1UUID } from '../config/d1.js';

export async function getMessageContactsD1(db: D1Database, userId: string, role: string) {
  return queryD1(
    db,
    `SELECT
       id,
       name,
       email,
       role,
       COALESCE(avatar_url, json_extract(profile_photo, '$.url')) AS avatar_url
     FROM users
     WHERE id <> ?
       AND (
         (? = 'user' AND role = 'partner')
         OR (
           ? = 'partner'
           AND role = 'user'
           AND EXISTS (
             SELECT 1
             FROM messages m
             WHERE m.from_user_id = users.id
               AND m.to_user_id = ?
             LIMIT 1
           )
         )
         OR (? = 'admin' AND role = 'admin')
       )
     ORDER BY CASE role WHEN 'partner' THEN 1 WHEN 'user' THEN 2 ELSE 3 END, name ASC`,
    [userId, role, role, userId, role]
  );
}

type MessageAttachmentInput = {
  filename: string;
  url: string;
  key?: string | null;
  mimetype?: string | null;
  size?: number | null;
};

export async function sendMessageD1(
  db: D1Database,
  fromUserId: string,
  toUserId: string,
  content: string,
  attachments: MessageAttachmentInput[] = []
) {
  const sender = await getMessageUserD1(db, fromUserId);
  const recipient = await getMessageUserD1(db, toUserId);
  if (!recipient) {
    throw new Error('Recipient not found');
  }

  if (fromUserId === toUserId) {
    throw new Error('You cannot send a message to yourself');
  }

  if (!sender || !(await canDirectMessageD1(db, sender, recipient))) {
    throw new Error(getMessageLimitMessage(sender?.role, recipient.role));
  }

  const id = generateD1UUID();
  const result = await executeD1(
    db,
    `INSERT INTO messages (id, from_user_id, to_user_id, content)
     VALUES (?, ?, ?, ?)
     RETURNING *`,
    [id, fromUserId, toUserId, content.trim()]
  );

  for (const attachment of attachments) {
    if (!attachment?.url) {
      continue;
    }

    await executeD1(
      db,
      `INSERT INTO message_attachments (id, message_id, filename, url, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        generateD1UUID(),
        id,
        attachment.filename || 'Attachment',
        attachment.url,
        JSON.stringify({
          key: attachment.key || null,
          mimetype: attachment.mimetype || null,
          size: attachment.size ?? null,
        }),
      ]
    );

    await executeD1(
      db,
      `UPDATE uploaded_files
       SET related_entity_type = 'message',
           related_entity_id = ?,
           purpose = 'message_attachment',
           updated_at = CURRENT_TIMESTAMP
       WHERE url = ?`,
      [id, attachment.url]
    );
  }

  return hydrateMessage(db, normalizeMessage(result?.results?.[0]));
}

export async function createSystemMessageD1(
  db: D1Database,
  payload: {
    fromUserId: string;
    toUserId: string;
    content: string;
    actionUrl?: string;
    relatedSubmissionId?: string | null;
    relatedTransactionId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const id = generateD1UUID();
  const result = await executeD1(
    db,
    `INSERT INTO messages (
       id, from_user_id, to_user_id, content,
       related_submission_id, related_transaction_id, action_url, metadata
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      id,
      payload.fromUserId,
      payload.toUserId,
      payload.content.trim(),
      payload.relatedSubmissionId || null,
      payload.relatedTransactionId || null,
      payload.actionUrl || null,
      JSON.stringify(payload.metadata || {}),
    ]
  );

  return normalizeMessage(result?.results?.[0]);
}

export async function getMessagesD1(db: D1Database, currentUserId: string, userId: string) {
  if (userId === currentUserId) {
    throw new Error('You cannot open a conversation with yourself');
  }

  const currentUser = await getMessageUserD1(db, currentUserId);
  const otherUser = await getMessageUserD1(db, userId);

  if (!otherUser) {
    throw new Error('Conversation user not found');
  }

  if (!currentUser || !(await canDirectMessageD1(db, currentUser, otherUser))) {
    throw new Error(getMessageLimitMessage(currentUser?.role, otherUser.role));
  }

  await executeD1(
    db,
    `UPDATE messages
     SET read = 1,
         read_at = CURRENT_TIMESTAMP
     WHERE from_user_id = ? AND to_user_id = ? AND read = 0`,
    [userId, currentUserId]
  );

  const result = await queryD1(
    db,
    `SELECT * FROM messages
     WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY created_at ASC`,
    [currentUserId, userId, userId, currentUserId]
  );
  return {
    ...result,
    results: await Promise.all((result.results || []).map((row) => hydrateMessage(db, normalizeMessage(row)))),
  };
}

export async function getConversationsD1(db: D1Database, userId: string, role: string) {
  return queryD1(
    db,
    `WITH scoped_messages AS (
       SELECT
         m.*,
         CASE
           WHEN m.from_user_id = ? THEN m.to_user_id
           ELSE m.from_user_id
         END AS other_user_id
       FROM messages m
       WHERE (m.from_user_id = ? OR m.to_user_id = ?)
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
       COALESCE(u.avatar_url, json_extract(u.profile_photo, '$.url')) AS other_user_avatar_url,
       rm.content AS last_message_content,
       rm.from_user_id AS last_message_from_user_id,
       rm.created_at AS last_message_time,
       COALESCE(unread.unread_count, 0) AS unread_count
     FROM ranked_messages rm
     JOIN users u ON u.id = rm.other_user_id
     LEFT JOIN (
       SELECT from_user_id, COUNT(*) AS unread_count
       FROM messages
       WHERE to_user_id = ? AND read = 0
       GROUP BY from_user_id
     ) unread ON unread.from_user_id = rm.other_user_id
     WHERE rm.row_number = 1
       AND rm.other_user_id <> ?
       AND (
         (? = 'user' AND u.role = 'partner')
         OR (
           ? = 'partner'
           AND u.role = 'user'
           AND EXISTS (
             SELECT 1
             FROM messages starter
             WHERE starter.from_user_id = u.id
               AND starter.to_user_id = ?
             LIMIT 1
           )
         )
         OR (? = 'admin' AND u.role = 'admin')
       )
     ORDER BY rm.created_at DESC`,
    [userId, userId, userId, userId, userId, role, role, userId, role]
  );
}

export async function markMessageAsReadD1(db: D1Database, id: string, userId: string) {
  const result = await executeD1(
    db,
    `UPDATE messages
     SET read = 1
     WHERE id = ? AND to_user_id = ?
     RETURNING *`,
    [id, userId]
  );

  return normalizeMessage(result?.results?.[0]);
}

function normalizeMessage(row: any) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    read: Boolean(row.read),
    metadata: parseJsonObject(row.metadata),
  };
}

async function hydrateMessage(db: D1Database, message: any) {
  if (!message) {
    return null;
  }

  const attachments = await queryD1(
    db,
    'SELECT id, filename, url, metadata, uploaded_at FROM message_attachments WHERE message_id = ? ORDER BY uploaded_at ASC',
    [message.id]
  );

  return {
    ...message,
    attachments: (attachments.results || []).map(normalizeAttachment),
  };
}

function normalizeAttachment(row: any) {
  const metadata = parseJsonObject(row.metadata);
  return {
    id: row.id,
    filename: row.filename || 'Attachment',
    url: row.url,
    uploaded_at: row.uploaded_at,
    metadata,
  };
}

function parseJsonObject(value: unknown) {
  if (value && typeof value === 'object') {
    return value;
  }

  if (typeof value !== 'string' || value.length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

type MessageUser = {
  id: string;
  role: string;
};

async function getMessageUserD1(db: D1Database, userId: string): Promise<MessageUser | null> {
  const row = await queryD1First(db, 'SELECT id, role FROM users WHERE id = ?', [userId]);
  return row ? { id: String(row.id), role: String(row.role) } : null;
}

async function canDirectMessageD1(db: D1Database, sender: MessageUser, recipient: MessageUser) {
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
    const row = await queryD1First(
      db,
      `SELECT 1
       FROM messages
       WHERE from_user_id = ? AND to_user_id = ?
       LIMIT 1`,
      [recipient.id, sender.id]
    );
    return Boolean(row);
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
