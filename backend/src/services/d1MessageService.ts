import { D1Database, executeD1, queryD1, queryD1First, generateD1UUID } from '../config/d1.js';

export async function getMessageContactsD1(db: D1Database, userId: string, role: string) {
  const allowedRoles =
    role === 'user'
      ? ['partner', 'admin']
      : role === 'partner'
      ? ['user', 'admin']
      : ['user', 'partner', 'admin'];

  return queryD1(
    db,
    `SELECT id, name, email, role, avatar_url
     FROM users
     WHERE id <> ? AND role IN (${allowedRoles.map(() => '?').join(',')})
     ORDER BY CASE role WHEN 'partner' THEN 1 WHEN 'user' THEN 2 ELSE 3 END, name ASC`,
    [userId, ...allowedRoles]
  );
}

export async function sendMessageD1(db: D1Database, fromUserId: string, toUserId: string, content: string) {
  const recipient = await queryD1First(db, 'SELECT id FROM users WHERE id = ?', [toUserId]);
  if (!recipient) {
    throw new Error('Recipient not found');
  }

  if (fromUserId === toUserId) {
    throw new Error('You cannot send a message to yourself');
  }

  const id = generateD1UUID();
  const result = await executeD1(
    db,
    `INSERT INTO messages (id, from_user_id, to_user_id, content)
     VALUES (?, ?, ?, ?)
     RETURNING *`,
    [id, fromUserId, toUserId, content.trim()]
  );

  return normalizeMessage(result?.results?.[0]);
}

export async function createSystemMessageD1(
  db: D1Database,
  payload: {
    fromUserId: string;
    toUserId: string;
    content: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const id = generateD1UUID();
  const result = await executeD1(
    db,
    `INSERT INTO messages (id, from_user_id, to_user_id, content, action_url, metadata)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      id,
      payload.fromUserId,
      payload.toUserId,
      payload.content.trim(),
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
    results: result.results?.map(normalizeMessage),
  };
}

export async function getConversationsD1(db: D1Database, userId: string) {
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
       u.avatar_url AS other_user_avatar_url,
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
     ORDER BY rm.created_at DESC`,
    [userId, userId, userId, userId]
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
