import { D1Database, executeD1, queryD1, queryD1First, generateD1UUID } from '../config/d1.js';

export async function getNotificationsD1(db: D1Database, userId: string, unreadOnly = false) {
  const sql = `SELECT * FROM notifications WHERE user_id = ?${unreadOnly ? ' AND read = 0' : ''} ORDER BY created_at DESC LIMIT 50`;
  const result = await queryD1(db, sql, [userId]);
  return {
    ...result,
    results: result.results?.map(normalizeNotification),
  };
}

export async function getUnreadNotificationCountD1(db: D1Database, userId: string) {
  const result = await queryD1First(
    db,
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
    [userId]
  );

  return result ? Number(result.count) : 0;
}

export async function markNotificationAsReadD1(db: D1Database, id: string, userId: string) {
  const result = await executeD1(
    db,
    `UPDATE notifications
     SET read = 1,
         read_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?
     RETURNING *`,
    [id, userId]
  );

  return normalizeNotification(result?.results?.[0]);
}

export async function markAllNotificationsAsReadD1(db: D1Database, userId: string) {
  const result = await executeD1(
    db,
    `UPDATE notifications
     SET read = 1,
         read_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND read = 0`,
    [userId]
  );

  return result?.results?.map(normalizeNotification) ?? [];
}

export async function createNotificationD1(
  db: D1Database,
  payload: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }
) {
  const id = generateD1UUID();
  const result = await executeD1(
    db,
    `INSERT INTO notifications (id, user_id, type, title, body, data)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [id, payload.userId, payload.type, payload.title, payload.body || null, JSON.stringify(payload.data || {})]
  );

  return normalizeNotification(result?.results?.[0]);
}

function normalizeNotification(row: any) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    read: Boolean(row.read),
    data: parseJsonObject(row.data),
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
