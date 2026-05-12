import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../utils/errorHandler.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { enqueueNotification } from '../services/jobQueue.js';

export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { submission_id, to_partner_id, type, amount, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    // Only admins can create transactions for users
    if (req.user?.role !== 'admin' && req.user?.role !== 'partner') {
      throw new AppError(403, 'Only admins or partners can create transactions');
    }

    // Validate submission exists and belongs to a user
    const submissionResult = await query(
      'SELECT id, user_id, status FROM submissions WHERE id = $1',
      [submission_id]
    );

    if (submissionResult.rows.length === 0) {
      throw new AppError(404, 'Submission not found');
    }

    // Validate partner exists
    const partnerResult = await query('SELECT id FROM partners WHERE id = $1', [to_partner_id]);

    if (partnerResult.rows.length === 0) {
      throw new AppError(404, 'Partner not found');
    }

    const id = uuidv4();
    const transactionResult = await query(
      `INSERT INTO transactions (id, submission_id, from_user_id, to_partner_id, type, amount, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, submission_id, submissionResult.rows[0].user_id, to_partner_id, type, amount || null, notes || null, 'pending']
    );

    // Update submission status and assigned partner
    await query(
      'UPDATE submissions SET assigned_partner_id = $1, status = $2 WHERE id = $3',
      [to_partner_id, 'processed', submission_id]
    );

    // Notify user about transaction
    await enqueueNotification(
      submissionResult.rows[0].user_id,
      'partner_update',
      'Your submission has been assigned',
      `Your submission has been assigned to a partner for ${type}.`,
      { submissionId: submission_id, type }
    );

    res.status(201).json({
      message: 'Transaction created successfully',
      data: transactionResult.rows[0],
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getTransactionsBySubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT t.* FROM transactions t
       JOIN submissions s ON t.submission_id = s.id
       WHERE t.submission_id = $1 AND (s.user_id = $2 OR $3 = 'admin' OR $3 = 'partner')
       ORDER BY t.created_at DESC`,
      [submissionId, userId, req.user?.role]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getTransactionsByUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT t.*, s.item_type, s.condition, p.name as partner_name
       FROM transactions t
       JOIN submissions s ON t.submission_id = s.id
       JOIN partners p ON t.to_partner_id = p.id
       WHERE t.from_user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
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

export const getTransactionsByPartner = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    // Only partners can view their own transactions, admins can view all
    if (req.user?.role === 'partner') {
      const partnerCheck = await query(
        'SELECT id FROM partners WHERE id = $1 AND user_id = $2',
        [partnerId, userId]
      );

      if (partnerCheck.rows.length === 0) {
        throw new AppError(403, 'You do not have permission to view these transactions');
      }
    }

    const result = await query(
      `SELECT t.*, s.item_type, s.condition, u.name as user_name, u.email as user_email
       FROM transactions t
       JOIN submissions s ON t.submission_id = s.id
       JOIN users u ON t.from_user_id = u.id
       WHERE t.to_partner_id = $1
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [partnerId]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const updateTransactionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    // Get transaction and check permissions
    const transactionResult = await query('SELECT * FROM transactions WHERE id = $1', [id]);

    if (transactionResult.rows.length === 0) {
      throw new AppError(404, 'Transaction not found');
    }

    const transaction = transactionResult.rows[0];

    // Only admins and assigned partners can update
    if (req.user?.role !== 'admin') {
      const partnerCheck = await query(
        'SELECT id FROM partners WHERE id = $1 AND user_id = $2',
        [transaction.to_partner_id, userId]
      );

      if (partnerCheck.rows.length === 0) {
        throw new AppError(403, 'You do not have permission to update this transaction');
      }
    }

    const result = await query(
      `UPDATE transactions
       SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, notes || null, id]
    );

    // Notify user about status change
    const submissionResult = await query('SELECT user_id FROM submissions WHERE id = $1', [
      transaction.submission_id,
    ]);

    if (submissionResult.rows.length > 0) {
      await enqueueNotification(
        submissionResult.rows[0].user_id,
        'submission_approved',
        `Your submission status has been updated to ${status}`,
        `Your submission is now ${status}.`,
        { submissionId: transaction.submission_id, status }
      );
    }

    res.json({
      message: 'Transaction updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
