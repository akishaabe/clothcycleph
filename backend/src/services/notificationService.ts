import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../config/redis.js';

export type NotificationType = 'submission_approved' | 'submission_rejected' | 'message' | 'partner_update' | 'system';

interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function createNotification(payload: CreateNotificationPayload) {
  try {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO notifications (id, user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, payload.userId, payload.type, payload.title, payload.body || null, JSON.stringify(payload.data || {})]
    );

    // Cache notification count in Redis
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(`notifications:${payload.userId}:count`);
      } catch (error) {
        console.warn('Redis cache deletion failed:', error);
      }
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function getUserNotifications(userId: string, unreadOnly = false) {
  try {
    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (unreadOnly) {
      sql += ' AND read = false';
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const redis = getRedisClient();
    const cacheKey = `notifications:${userId}:count`;

    // Check cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return parseInt(cached, 10);
        }
      } catch (error) {
        console.warn('Redis get failed:', error);
      }
    }

    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );

    const count = parseInt(result.rows[0].count, 10);

    // Cache for 5 minutes
    if (redis) {
      try {
        await redis.setEx(cacheKey, 300, count.toString());
      } catch (error) {
        console.warn('Redis set failed:', error);
      }
    }

    return count;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    throw error;
  }
}

export async function getNotificationPreferences(userId: string) {
  const result = await query(
    `INSERT INTO user_preferences (id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [uuidv4(), userId]
  );
  void result;

  const preferences = await query(
    `SELECT email_notifications, push_notifications, sms_notifications
     FROM user_preferences
     WHERE user_id = $1`,
    [userId]
  );

  return preferences.rows[0] || {
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    sms_notifications?: boolean;
  }
) {
  const result = await query(
    `INSERT INTO user_preferences (
       id, user_id, email_notifications, push_notifications, sms_notifications, updated_at
     )
     VALUES ($1, $2, COALESCE($3, true), COALESCE($4, true), COALESCE($5, false), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       email_notifications = COALESCE(EXCLUDED.email_notifications, user_preferences.email_notifications),
       push_notifications = COALESCE(EXCLUDED.push_notifications, user_preferences.push_notifications),
       sms_notifications = COALESCE(EXCLUDED.sms_notifications, user_preferences.sms_notifications),
       updated_at = NOW()
     RETURNING email_notifications, push_notifications, sms_notifications`,
    [
      uuidv4(),
      userId,
      preferences.email_notifications,
      preferences.push_notifications,
      preferences.sms_notifications,
    ]
  );

  return result.rows[0];
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const result = await query(
      `UPDATE notifications
       SET read = true, read_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );

    if (result.rows.length > 0) {
      // Invalidate cache
      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.del(`notifications:${result.rows[0].user_id}:count`);
        } catch (error) {
          console.warn('Redis cache deletion failed:', error);
        }
      }
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const result = await query(
      `UPDATE notifications
       SET read = true, read_at = NOW()
       WHERE user_id = $1 AND read = false
       RETURNING *`,
      [userId]
    );

    // Invalidate cache
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(`notifications:${userId}:count`);
      } catch (error) {
        console.warn('Redis cache deletion failed:', error);
      }
    }

    return result.rows;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

export async function deleteNotification(notificationId: string, userId: string) {
  try {
    const result = await query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(`notifications:${userId}:count`);
      } catch (error) {
        console.warn('Redis cache deletion failed:', error);
      }
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// Bulk notification creation (e.g., when a new partner joins)
export async function notifyUsers(userIds: string[], notification: Omit<CreateNotificationPayload, 'userId'>) {
  try {
    const ids = userIds.map(() => uuidv4());
    const values = userIds
      .map((userId, index) => [
        ids[index],
        userId,
        notification.type,
        notification.title,
        notification.body || null,
        JSON.stringify(notification.data || {}),
      ])
      .flat();

    const placeholders = userIds
      .map((_, index) => {
        const offset = index * 6;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
      })
      .join(',');

    const result = await query(
      `INSERT INTO notifications (id, user_id, type, title, body, data)
       VALUES ${placeholders}
       RETURNING *`,
      values
    );

    // Invalidate caches
    const redis = getRedisClient();
    if (redis) {
      const keys = userIds.map((userId) => `notifications:${userId}:count`);
      try {
        await Promise.all(keys.map((key) => redis.del(key)));
      } catch (error) {
        console.warn('Redis cache deletion failed:', error);
      }
    }

    return result.rows;
  } catch (error) {
    console.error('Error bulk notifying users:', error);
    throw error;
  }
}
