import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { AppError } from '../utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { to_user_id, content } = req.body;
    const fromUserId = req.user?.id;

    if (!fromUserId) {
      throw new AppError(401, 'User not authenticated');
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO messages (id, from_user_id, to_user_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, fromUserId, to_user_id, content]
    );

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
      `SELECT DISTINCT 
        CASE 
          WHEN from_user_id = $1 THEN to_user_id 
          ELSE from_user_id 
        END as other_user_id,
        MAX(created_at) as last_message_time
       FROM messages
       WHERE from_user_id = $1 OR to_user_id = $1
       GROUP BY other_user_id
       ORDER BY last_message_time DESC`,
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

    const result = await query(
      `UPDATE messages SET read = true WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Message not found');
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
