import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { AppError } from '../utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

export const createSubmission = async (req: Request, res: Response) => {
  try {
    const { item_type, condition, fabric, cleanliness, description, photos } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO submissions (id, user_id, item_type, condition, fabric, cleanliness, description, photos, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, userId, item_type, condition, fabric, cleanliness, description, photos || [], 'pending']
    );

    res.status(201).json({
      message: 'Submission created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getUserSubmissions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC`,
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

export const getSubmissionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM submissions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Submission not found');
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const updateSubmissionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
      `UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Submission not found');
    }

    res.json({
      message: 'Submission updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
