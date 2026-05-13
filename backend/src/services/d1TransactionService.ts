import { D1Database, executeD1, queryD1, queryD1First, generateD1UUID } from '../config/d1.js';
import { createNotificationD1 } from './d1NotificationService.js';

export async function createTransactionD1(
  db: D1Database,
  userId: string,
  role: string,
  payload: {
    submission_id: string;
    to_partner_id: string;
    type: string;
    amount?: number;
    notes?: string;
  }
) {
  const submission = await queryD1First(db, 'SELECT id, user_id FROM submissions WHERE id = ?', [payload.submission_id]);
  if (!submission) {
    throw new Error('Submission not found');
  }

  const partner = await queryD1First(db, 'SELECT id FROM partners WHERE id = ?', [payload.to_partner_id]);
  if (!partner) {
    throw new Error('Partner not found');
  }

  if (role !== 'admin' && role !== 'partner') {
    throw new Error('Only admins or partners can create transactions');
  }

  const id = generateD1UUID();
  const transaction = await executeD1(
    db,
    `INSERT INTO transactions (id, submission_id, from_user_id, to_partner_id, type, amount, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
     RETURNING *`,
    [
      id,
      payload.submission_id,
      submission.user_id,
      payload.to_partner_id,
      payload.type,
      payload.amount ?? null,
      payload.notes ?? null,
    ]
  );

  await executeD1(
    db,
    'UPDATE submissions SET assigned_partner_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [payload.to_partner_id, 'processed', payload.submission_id]
  );

  await createNotificationD1(db, {
    userId: submission.user_id,
    type: 'partner_update',
    title: 'Your submission has been assigned',
    body: `Your submission has been assigned to a partner for ${payload.type}.`,
    data: { submissionId: payload.submission_id, type: payload.type },
  });

  return transaction?.results?.[0] ?? null;
}

export async function getTransactionsBySubmissionD1(db: D1Database, userId: string, role: string, submissionId: string) {
  return queryD1(
    db,
    `SELECT t.* FROM transactions t
     JOIN submissions s ON t.submission_id = s.id
     WHERE t.submission_id = ? AND (s.user_id = ? OR ? = 'admin' OR ? = 'partner')
     ORDER BY t.created_at DESC`,
    [submissionId, userId, role, role]
  );
}

export async function getTransactionsByUserD1(db: D1Database, userId: string) {
  return queryD1(
    db,
    `SELECT t.*, s.item_type, s.condition, p.name as partner_name
     FROM transactions t
     JOIN submissions s ON t.submission_id = s.id
     JOIN partners p ON t.to_partner_id = p.id
     WHERE t.from_user_id = ?
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [userId]
  );
}

export async function getTransactionsByPartnerD1(db: D1Database, userId: string, role: string, partnerId: string) {
  if (role === 'partner') {
    const partnerCheck = await queryD1First(
      db,
      'SELECT id FROM partners WHERE id = ? AND user_id = ?',
      [partnerId, userId]
    );

    if (!partnerCheck) {
      throw new Error('You do not have permission to view these transactions');
    }
  }

  return queryD1(
    db,
    `SELECT t.*, s.item_type, s.condition, u.name as user_name, u.email as user_email
     FROM transactions t
     JOIN submissions s ON t.submission_id = s.id
     JOIN users u ON t.from_user_id = u.id
     WHERE t.to_partner_id = ?
     ORDER BY t.created_at DESC
     LIMIT 100`,
    [partnerId]
  );
}

export async function updateTransactionStatusD1(
  db: D1Database,
  userId: string,
  role: string,
  id: string,
  status: string,
  notes?: string
) {
  const transaction = await queryD1First(db, 'SELECT * FROM transactions WHERE id = ?', [id]);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  if (role !== 'admin') {
    const partnerCheck = await queryD1First(
      db,
      'SELECT id FROM partners WHERE id = ? AND user_id = ?',
      [transaction.to_partner_id, userId]
    );

    if (!partnerCheck) {
      throw new Error('You do not have permission to update this transaction');
    }
  }

  const result = await executeD1(
    db,
    `UPDATE transactions
     SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
     RETURNING *`,
    [status, notes ?? null, id]
  );

  const submission = await queryD1First(db, 'SELECT user_id FROM submissions WHERE id = ?', [transaction.submission_id]);
  if (submission) {
    await createNotificationD1(db, {
      userId: submission.user_id,
      type: 'submission_approved',
      title: `Your submission status has been updated to ${status}`,
      body: `Your submission is now ${status}.`,
      data: { submissionId: transaction.submission_id, status },
    });
  }

  return result?.results?.[0] ?? null;
}
