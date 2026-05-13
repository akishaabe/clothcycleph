import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getClient, query } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../utils/errorHandler.js';
import { enqueueNotification } from '../services/jobQueue.js';
import { analyzeBurnTest, buildPathwayRecommendations } from '../services/dssEngine.js';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
};

function splitText(value?: string | null) {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function normalizePathway(value?: string | null) {
  const normalized = value?.toLowerCase();
  return ['recycle', 'donate', 'upcycle', 'buyback'].includes(normalized || '')
    ? normalized
    : 'recycle';
}

function normalizeText(value?: string | null) {
  return (value || '').toLowerCase().trim();
}

function titleCase(value?: string | null) {
  if (!value) {
    return 'Not specified';
  }

  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildBrief(submission: any, recommendation: any) {
  const details = submission.details || {};
  const burnTest = submission.burn_test || {};
  const lines = [
    `Recommended pathway: ${titleCase(recommendation.recommended_pathway)} (${Math.round(recommendation.confidence * 100)}% confidence)`,
    `Item: ${submission.item_type}`,
    `Quantity: ${submission.quantity || 1}`,
    `Condition: ${submission.condition}`,
    `Cleanliness: ${submission.cleanliness || 'Not specified'}`,
    `Fabric: ${submission.fabric || details.fabric_types || details.fabric_description || 'Not specified'}`,
    `Fabric identified by: ${details.fabric_identification || 'Not specified'}`,
    `Brand: ${details.no_brand_visible ? 'No brand visible' : details.brand || 'Not specified'}`,
    `Burn test: ${burnTest.performed ? 'Performed' : 'Not performed'}`,
  ];

  if (burnTest.performed) {
    lines.push(`Burn observations: ${[
      burnTest.moment,
      burnTest.flames,
      burnTest.no_flame,
      burnTest.smell,
      burnTest.ashes,
    ].filter(Boolean).join(' | ')}`);
    lines.push(`Burn-test fabric result: ${recommendation.burn_test_result || 'No clear match'}`);
  }

  if (submission.description) {
    lines.push(`User note: ${submission.description}`);
  }

  lines.push(`Recommendation note: ${recommendation.explanation}`);

  return lines.join('\n');
}

async function getSubmissionForUser(submissionId: string, userId: string, role?: string) {
  const result = await query(
    `SELECT
       s.*,
       row_to_json(sd) AS details,
       row_to_json(bt) AS burn_test
     FROM submissions s
     LEFT JOIN submission_details sd ON sd.submission_id = s.id
     LEFT JOIN LATERAL (
       SELECT *
       FROM burn_tests
       WHERE submission_id = s.id
       ORDER BY created_at DESC
       LIMIT 1
     ) bt ON true
     WHERE s.id = $1 AND (s.user_id = $2 OR $3 = 'admin')`,
    [submissionId, userId, role]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Submission not found');
  }

  return result.rows[0];
}

export const listPartners = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, description, logo_url, email, phone, address, website, service_types, contact_person, rating, verified
       FROM partners
       WHERE COALESCE(status, 'active') IN ('active', 'pending')
       ORDER BY verified DESC, rating DESC, name ASC`
    );

    res.json({ data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getSubmissionDss = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const submission = await getSubmissionForUser(req.params.submissionId, userId, req.user?.role);
    const recommendations = buildPathwayRecommendations(submission);
    const burn_test_analysis = analyzeBurnTest(submission.burn_test);

    res.json({
      data: {
        submission,
        recommendations,
        burn_test_analysis,
        brief: buildBrief(submission, recommendations[0]),
      },
    });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const sendRecommendationToPartner = async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  let transactionStarted = false;

  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const { submission_id, partner_id, recommended_pathway, brief } = req.body;
    const submission = await getSubmissionForUser(submission_id, userId, req.user?.role);

    const partnerResult = await query(
      `SELECT id, name, user_id
       FROM partners
       WHERE id = $1 AND COALESCE(status, 'active') IN ('active', 'pending')`,
      [partner_id]
    );

    if (partnerResult.rows.length === 0) {
      throw new AppError(404, 'Partner not found');
    }

    const partner = partnerResult.rows[0];
    const recommendation = buildPathwayRecommendations(submission).find(
      (item) => item.recommended_pathway === recommended_pathway
    ) || buildPathwayRecommendations(submission)[0];

    await client.query('BEGIN');
    transactionStarted = true;

    const runId = uuidv4();
    await client.query(
      `INSERT INTO recommendation_runs (
         id, submission_id, requested_by_user_id, engine_name, engine_version,
         status, criteria, input_snapshot, completed_at
       )
       VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, NOW())`,
      [
        runId,
        submission_id,
        userId,
        'dss-preview',
        'handoff-v1',
        JSON.stringify({ selected_partner_id: partner_id, selected_pathway: recommended_pathway }),
        JSON.stringify(submission),
      ]
    );

    const resultId = uuidv4();
    await client.query(
      `INSERT INTO recommendation_results (
         id, run_id, submission_id, partner_id, recommended_pathway,
         rank, score, confidence, explanation, details, output_payload, selected
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
      [
        resultId,
        runId,
        submission_id,
        partner_id,
        recommended_pathway,
        recommendation.rank,
        recommendation.score,
        recommendation.confidence,
        recommendation.explanation,
        brief,
        JSON.stringify({ recommendation, brief, burn_test_analysis: analyzeBurnTest(submission.burn_test) }),
      ]
    );

    const transactionId = uuidv4();
    const transactionResult = await client.query(
      `INSERT INTO transactions (
         id, submission_id, from_user_id, to_partner_id, type, status, notes
       )
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
      [transactionId, submission_id, userId, partner_id, recommended_pathway, brief]
    );

    await client.query(
      `UPDATE submissions
       SET assigned_partner_id = $1, service_type = $2, updated_at = NOW()
       WHERE id = $3`,
      [partner_id, recommended_pathway, submission_id]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    if (partner.user_id) {
      await enqueueNotification(
        partner.user_id,
        'partner_update',
        'New textile request',
        `A user sent a ${titleCase(recommended_pathway)} request for your review.`,
        { submissionId: submission_id, transactionId }
      );
    }

    await enqueueNotification(
      userId,
      'partner_update',
      'Request sent to partner',
      `Your textile brief was sent to ${partner.name}.`,
      { submissionId: submission_id, transactionId }
    );

    res.status(201).json({
      message: 'Recommendation sent to partner',
      data: {
        transaction: transactionResult.rows[0],
        recommendation_result_id: resultId,
        recommendation_run_id: runId,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }

    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
};

export const getUserDssRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT
         t.*,
         p.name AS partner_name,
         p.email AS partner_email,
         s.item_type,
         s.quantity,
         s.condition,
         s.cleanliness,
         rr.confidence,
         rr.explanation
       FROM transactions t
       JOIN partners p ON p.id = t.to_partner_id
       JOIN submissions s ON s.id = t.submission_id
       LEFT JOIN recommendation_results rr ON rr.submission_id = s.id AND rr.partner_id = p.id AND rr.selected = true
       WHERE t.from_user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    res.json({ data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getPartnerDssRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const partnerResult = await query('SELECT id FROM partners WHERE user_id = $1 OR lower(email) = lower($2)', [
      userId,
      req.user?.email,
    ]);

    if (partnerResult.rows.length === 0 && req.user?.role !== 'admin') {
      throw new AppError(404, 'Partner profile not found');
    }

    const params = req.user?.role === 'admin' ? [] : [partnerResult.rows[0].id];
    const whereClause = req.user?.role === 'admin' ? '' : 'WHERE t.to_partner_id = $1';

    const result = await query(
      `SELECT
         t.*,
         s.item_type,
         s.quantity,
         s.condition,
         s.cleanliness,
         s.fabric,
         s.description,
         s.photos,
         row_to_json(sd) AS details,
         row_to_json(bt) AS burn_test,
         u.name AS user_name,
         u.email AS user_email,
         rr.confidence,
         rr.explanation,
         rr.output_payload
       FROM transactions t
       JOIN submissions s ON s.id = t.submission_id
       JOIN users u ON u.id = t.from_user_id
       LEFT JOIN submission_details sd ON sd.submission_id = s.id
       LEFT JOIN LATERAL (
         SELECT *
         FROM burn_tests
         WHERE submission_id = s.id
         ORDER BY created_at DESC
         LIMIT 1
       ) bt ON true
       LEFT JOIN recommendation_results rr ON rr.submission_id = s.id AND rr.partner_id = t.to_partner_id AND rr.selected = true
       ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    res.json({
      data: result.rows.map((row) => ({
        ...row,
        status_label: statusLabels[row.status] || row.status,
        details: {
          ...row.details,
          item_types_list: splitText(row.details?.item_types),
          fabric_types_list: splitText(row.details?.fabric_types),
          fabric_description_list: splitText(row.details?.fabric_description),
        },
      })),
      count: result.rows.length,
    });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const updateDssRequestStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const transactionResult = await query(
      `SELECT t.*, p.user_id AS partner_user_id, p.email AS partner_email
       FROM transactions t
       JOIN partners p ON p.id = t.to_partner_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (transactionResult.rows.length === 0) {
      throw new AppError(404, 'Request not found');
    }

    const transaction = transactionResult.rows[0];

    if (
      req.user?.role !== 'admin' &&
      transaction.partner_user_id !== userId &&
      normalizeText(transaction.partner_email) !== normalizeText(req.user?.email)
    ) {
      throw new AppError(403, 'You do not have permission to update this request');
    }

    const result = await query(
      `UPDATE transactions
       SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [req.body.status, req.body.notes || null, req.params.id]
    );

    await enqueueNotification(
      transaction.from_user_id,
      req.body.status === 'declined' ? 'submission_rejected' : 'submission_approved',
      `Partner ${req.body.status === 'declined' ? 'declined' : 'accepted'} your request`,
      `Your ${titleCase(transaction.type)} request is now ${statusLabels[req.body.status] || req.body.status}.`,
      { submissionId: transaction.submission_id, transactionId: transaction.id, status: req.body.status }
    );

    res.json({
      message: 'Request status updated',
      data: result.rows[0],
    });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const remindDssRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const requestResult = await query(
      `SELECT t.*, p.name AS partner_name, p.user_id AS partner_user_id, p.email AS partner_email
       FROM transactions t
       JOIN partners p ON p.id = t.to_partner_id
       WHERE t.id = $1 AND t.from_user_id = $2`,
      [req.params.id, userId]
    );

    if (requestResult.rows.length === 0) {
      throw new AppError(404, 'Request not found');
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      throw new AppError(400, 'Only pending requests can receive reminders');
    }

    const updateResult = await query(
      `UPDATE transactions
       SET updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (request.partner_user_id) {
      await enqueueNotification(
        request.partner_user_id,
        'partner_update',
        'Reminder: textile request pending',
        req.body.message || `A user is waiting for your response to a ${titleCase(request.type)} request.`,
        { submissionId: request.submission_id, transactionId: request.id }
      );
    }

    res.json({
      message: `Reminder sent to ${request.partner_name}.`,
      data: updateResult.rows[0],
    });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};
