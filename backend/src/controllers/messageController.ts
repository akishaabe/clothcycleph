import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { AppError } from '../utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { emitMessageCreated } from '../services/socketService.js';

export const getMessageContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      throw new AppError(401, 'User not authenticated');
    }

    const allowedRoles =
      role === 'user'
        ? ['partner', 'admin']
        : role === 'partner'
          ? ['user', 'admin']
          : ['user', 'partner', 'admin'];

    const result = await query(
      `SELECT id, name, email, role, avatar_url
       FROM users
       WHERE id <> $1 AND role = ANY($2)
       ORDER BY
         CASE role
           WHEN 'partner' THEN 1
           WHEN 'user' THEN 2
           ELSE 3
         END,
         name ASC`,
      [userId, allowedRoles]
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
    const { to_user_id, content } = req.body;
    const fromUserId = req.user?.id;

    if (!fromUserId) {
      throw new AppError(401, 'User not authenticated');
    }

    if (!to_user_id || !content?.trim()) {
      throw new AppError(400, 'Recipient and message content are required');
    }

    if (to_user_id === fromUserId) {
      throw new AppError(400, 'You cannot send a message to yourself');
    }

    const recipient = await query(
      'SELECT id FROM users WHERE id = $1',
      [to_user_id]
    );

    if (recipient.rows.length === 0) {
      throw new AppError(404, 'Recipient not found');
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO messages (id, from_user_id, to_user_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, fromUserId, to_user_id, content.trim()]
    );

    emitMessageCreated(result.rows[0], [fromUserId, to_user_id]);

    res.status(201).json({
      message: 'Message sent successfully',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

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

    await query(
      `UPDATE messages
       SET read = true
       WHERE from_user_id = $1 AND to_user_id = $2 AND read = false`,
      [userId, currentUserId]
    );

    const result = await query(
      `SELECT * FROM messages 
       WHERE (from_user_id = $1 AND to_user_id = $2) 
          OR (from_user_id = $2 AND to_user_id = $1)
       ORDER BY created_at ASC`,
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

export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
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
         WHERE to_user_id = $1 AND read = false
         GROUP BY from_user_id
       ) unread ON unread.from_user_id = rm.other_user_id
       WHERE rm.row_number = 1
         AND rm.other_user_id <> $1
       ORDER BY rm.created_at DESC`,
      [userId]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

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
