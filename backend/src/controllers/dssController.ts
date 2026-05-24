import type { HttpResponse as Response } from '../types/http.js';
import { v4 as uuidv4 } from 'uuid';
import { getClient, query } from '../config/database.js';
import type { HttpRequest as AuthRequest } from '../types/http.js';
import { AppError } from '../utils/errorHandler.js';
import { enqueueNotification } from '../services/jobQueue.js';
import { analyzeBurnTest, buildPathwayRecommendations, DSS_ENGINE_VERSION } from '../services/dssEngine.js';
import { listPartnerLocations } from '../services/gisService.js';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  completed: 'Completed',
  rejected: 'Rejected',
};

function normalizeRequestStatus(status?: string | null) {
  if (status === 'declined' || status === 'rejected') {
    return 'rejected';
  }

  if (status === 'in_progress') {
    return 'accepted';
  }

  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'accepted') {
    return 'accepted';
  }

  return 'pending';
}

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

function csvCell(value: unknown) {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function parseOptionalNumber(value?: string | string[] | null) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getPartnerSearchOptions(req: AuthRequest) {
  return {
    latitude: parseOptionalNumber(req.query?.lat),
    longitude: parseOptionalNumber(req.query?.lng),
    pathway: typeof req.query?.pathway === 'string' ? req.query.pathway : undefined,
    radiusKm: parseOptionalNumber(req.query?.radius_km),
  };
}

function buildBrief(submission: any, recommendation: any) {
  const details = submission.details || {};
  const burnTest = submission.burn_test || {};
  const lines = [
    `Recommended pathway: ${titleCase(recommendation.recommended_pathway)} (${Math.round(recommendation.confidence * 100)}% confidence)`,
    `Submission name: ${submission.submission_name || submission.item_type}`,
    `Item: ${submission.item_type}`,
    submission.quantity ? `Quantity: ${submission.quantity}` : '',
    submission.details?.weight_value ? `Weight: ${submission.details.weight_value} ${submission.details.weight_unit || 'kg'}` : '',
    `Shipping bag: ${titleCase(bagColorByPathway[recommendation.recommended_pathway])} bag for ${titleCase(recommendation.recommended_pathway)}`,
    `Condition: ${submission.condition}`,
    `Cleanliness: ${submission.cleanliness || 'Not specified'}`,
    `Fabric: ${submission.fabric || details.fabric_types || details.fabric_description || 'Not specified'}`,
    `Fabric identified by: ${details.fabric_identification || 'Not specified'}`,
    `Brand: ${details.no_brand_visible ? 'No brand visible' : details.brand || 'Not specified'}`,
    `Burn test: ${burnTest.performed ? 'Performed' : 'Not performed'}`,
  ].filter(Boolean);

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

  if (submission.upcycle_request) {
    lines.push(`Upcycle request: ${submission.upcycle_request}`);
  }

  if (recommendation.recommended_pathway === 'upcycle') {
    lines.push(
      `Buyback preference: ${
        submission.buyback_interest
          ? 'Yes - user is open to buyback if the partner supports it'
          : 'No - upcycle service only'
      }`
    );
  }

  lines.push(`Recommendation note: ${recommendation.explanation}`);

  return lines.join('\n');
}

const bagColorByPathway: Record<string, string> = {
  recycle: 'white',
  upcycle: 'black',
  donate: 'green',
};

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

export const listPartners = async (req: AuthRequest, res: Response) => {
  try {
    const partners = await listPartnerLocations(getPartnerSearchOptions(req));
    res.json({ data: partners, count: partners.length });
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
    const selectedBuybackInterest = recommended_pathway === 'upcycle' && Boolean(req.body.buyback_interest);
    const submission = await getSubmissionForUser(submission_id, userId, req.user?.role);

    const partnerResult = await query(
      `SELECT p.id, p.name, p.user_id, p.email, COALESCE(p.user_id, u.id) AS resolved_user_id
       FROM partners p
       LEFT JOIN users u ON lower(u.email) = lower(p.email)
       WHERE p.id = $1 AND COALESCE(p.status, 'active') IN ('active', 'pending')`,
      [partner_id]
    );

    if (partnerResult.rows.length === 0) {
      throw new AppError(404, 'Partner not found');
    }

    const partner = partnerResult.rows[0];
    const recommendations = buildPathwayRecommendations(submission);
    const recommendation = recommendations.find(
      (item) => item.recommended_pathway === recommended_pathway
    ) || recommendations[0];

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
        'dss',
        DSS_ENGINE_VERSION,
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
        JSON.stringify({
          engine_version: DSS_ENGINE_VERSION,
          recommendation,
          recommendations,
          brief,
          buyback_interest: selectedBuybackInterest,
          bag_color: bagColorByPathway[recommended_pathway],
          estimated_distance_km: req.body.estimated_distance_km ?? null,
          estimated_carbon_kg: req.body.estimated_carbon_kg ?? null,
          burn_test_analysis: analyzeBurnTest(submission.burn_test),
          rule_checks: recommendation.checks || [],
        }),
      ]
    );

    const transactionId = uuidv4();
    const transactionResult = await client.query(
      `INSERT INTO transactions (
         id, submission_id, from_user_id, to_partner_id, type, status, notes,
         bag_color, estimated_distance_km, estimated_carbon_kg
       )
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9)
       RETURNING *`,
      [
        transactionId,
        submission_id,
        userId,
        partner_id,
        recommended_pathway,
        brief,
        bagColorByPathway[recommended_pathway],
        req.body.estimated_distance_km ?? null,
        req.body.estimated_carbon_kg ?? null,
      ]
    );

    await client.query(
      `UPDATE submissions
       SET assigned_partner_id = $1,
           service_type = $2,
           buyback_interest = $4,
           updated_at = NOW()
       WHERE id = $3`,
      [partner_id, recommended_pathway, submission_id, selectedBuybackInterest]
    );

    const partnerUserId = partner.resolved_user_id || partner.user_id;
    if (partnerUserId) {
      const messageId = uuidv4();
      await client.query(
        `INSERT INTO messages (
           id, from_user_id, to_user_id, content,
           related_submission_id, related_transaction_id, action_url, metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          messageId,
          userId,
          partnerUserId,
          `New submission request from me! I want to ${recommended_pathway} this item.`,
          submission_id,
          transactionId,
          `/partner?request=${transactionId}`,
          JSON.stringify({
            kind: 'dss_request',
            submission_id,
            transaction_id: transactionId,
            user_action_url: `/dss/${submission_id}?request=${transactionId}`,
            partner_action_url: `/partner?request=${transactionId}`,
          }),
        ]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    const senderResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const senderName = senderResult.rows[0]?.name || 'A user';

    if (partnerUserId) {
      await enqueueNotification(
        partnerUserId,
        'partner_update',
        'New textile request',
        `${senderName} sent a ${titleCase(recommended_pathway)} request for your review.`,
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
         p.address AS partner_address,
         s.item_type,
         s.submission_name,
         s.quantity,
         sd.weight_value,
         sd.weight_unit,
         s.condition,
         s.cleanliness,
         rr.confidence,
         rr.score,
         rr.explanation,
         rr.output_payload
       FROM transactions t
       JOIN partners p ON p.id = t.to_partner_id
       JOIN submissions s ON s.id = t.submission_id
       LEFT JOIN submission_details sd ON sd.submission_id = s.id
       LEFT JOIN recommendation_results rr ON rr.submission_id = s.id AND rr.partner_id = p.id AND rr.selected = true
       WHERE t.from_user_id = $1
       ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.created_at DESC`,
      [userId]
    );

    const rows = result.rows.map((row) => {
      const status = normalizeRequestStatus(row.status);
      return {
        ...row,
        status,
        status_label: statusLabels[status] || status,
      };
    });

    res.json({ data: rows, count: rows.length });
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
         s.submission_name,
         s.quantity,
         sd.weight_value,
         sd.weight_unit,
         s.condition,
         s.cleanliness,
         s.fabric,
         s.description,
         s.upcycle_request,
         s.buyback_interest,
         s.photos,
         row_to_json(sd) AS details,
         row_to_json(bt) AS burn_test,
         u.name AS user_name,
         u.email AS user_email,
         rr.confidence,
         rr.explanation,
         rr.output_payload,
         COALESCE((
           SELECT json_agg(rtu ORDER BY rtu.created_at DESC)
           FROM request_tracking_updates rtu
           WHERE rtu.submission_id = s.id
             AND (rtu.request_id = t.id OR rtu.request_id IS NULL)
         ), '[]'::json) AS tracking_updates,
         (
           SELECT row_to_json(rtu)
           FROM request_tracking_updates rtu
           WHERE rtu.submission_id = s.id
             AND (rtu.request_id = t.id OR rtu.request_id IS NULL)
           ORDER BY rtu.created_at DESC
           LIMIT 1
         ) AS latest_tracking_update
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
       ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.created_at DESC`,
      params
    );

    res.json({
      data: result.rows.map((row) => {
        const status = normalizeRequestStatus(row.status);
        return {
        ...row,
        status,
        status_label: statusLabels[status] || status,
        details: {
          ...row.details,
          item_types_list: splitText(row.details?.item_types),
          fabric_types_list: splitText(row.details?.fabric_types),
          fabric_description_list: splitText(row.details?.fabric_description),
        },
      };
      }),
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
      `SELECT t.*, p.user_id AS partner_user_id, p.email AS partner_email,
              COALESCE(s.submission_name, s.item_type, 'textile') AS submission_label
       FROM transactions t
       JOIN partners p ON p.id = t.to_partner_id
       JOIN submissions s ON s.id = t.submission_id
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

    const status = normalizeRequestStatus(req.body.status);
    const result = await query(
      `UPDATE transactions
       SET status = $1,
           notes = COALESCE($2, notes),
           outcome_title = COALESCE($3, outcome_title),
           outcome_description = COALESCE($4, outcome_description),
           outcome_photos = CASE
             WHEN $5::jsonb IS NOT NULL THEN $5::jsonb
             ELSE outcome_photos
           END,
           outcome_reported_at = CASE
             WHEN $3 IS NOT NULL OR $4 IS NOT NULL OR $5::jsonb IS NOT NULL THEN NOW()
             ELSE outcome_reported_at
           END,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        status,
        req.body.notes || null,
        req.body.outcome_title || null,
        req.body.outcome_description || null,
        req.body.outcome_photos == null ? null : JSON.stringify(req.body.outcome_photos || []),
        req.params.id,
      ]
    );

    const userActionUrl = `/dss/${transaction.submission_id}?request=${transaction.id}`;
    const outcomeCelebration =
      status === 'completed' && req.body.outcome_title
        ? `Congratulations! Your ${transaction.submission_label || 'textile'} was turned into ${req.body.outcome_title}!`
        : '';
    const messageContent =
      status === 'completed' && (req.body.outcome_title || req.body.outcome_description)
        ? `${outcomeCelebration || 'Your textile has a new story!'}\n${
            req.body.outcome_description || 'Your partner shared what happened to your textile.'
          }`
        : `Partner decision: ${statusLabels[status] || status}\n${
            req.body.notes ? `Message to user: ${req.body.notes}` : 'No additional message provided.'
          }`;
    await query(
      `INSERT INTO messages (
         id, from_user_id, to_user_id, content,
         related_submission_id, related_transaction_id, action_url, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4(),
        userId,
        transaction.from_user_id,
        messageContent,
        transaction.submission_id,
        transaction.id,
        userActionUrl,
        JSON.stringify({
          kind: 'dss_status_update',
          status,
          submission_id: transaction.submission_id,
          transaction_id: transaction.id,
          outcome_title: req.body.outcome_title || null,
          outcome_photos: req.body.outcome_photos || [],
          celebration: outcomeCelebration || null,
        }),
      ]
    );

    await enqueueNotification(
      transaction.from_user_id,
      status === 'rejected' ? 'submission_rejected' : 'submission_approved',
      status === 'completed'
        ? 'Congratulations! Your textile has a new life'
        : `Partner ${status === 'rejected' ? 'rejected' : 'updated'} your request`,
      status === 'completed' && req.body.outcome_title
        ? outcomeCelebration
        : `Your ${titleCase(transaction.type)} request is now ${statusLabels[status] || status}.`,
      {
        submissionId: transaction.submission_id,
        transactionId: transaction.id,
        status,
        action_url:
          status === 'accepted'
            ? `/my-requests?status=accepted&request=${transaction.id}`
            : `/dss-requests?request=${transaction.id}`,
      }
    );

    res.json({
      message: 'Request status updated',
      data: result.rows[0],
    });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const getDssAuditRuns = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      throw new AppError(403, 'Only admins can view DSS audit runs');
    }

    const result = await query(
      `SELECT
         rr.id AS result_id,
         rr.recommended_pathway,
         rr.rank,
         rr.score,
         rr.confidence,
         rr.explanation,
         rr.output_payload,
         r.id AS run_id,
         r.engine_name,
         r.engine_version,
         r.criteria,
         r.input_snapshot,
         r.created_at,
         s.submission_name,
         s.item_type,
         p.name AS partner_name,
         u.name AS requested_by_name
       FROM recommendation_results rr
       JOIN recommendation_runs r ON r.id = rr.run_id
       LEFT JOIN submissions s ON s.id = rr.submission_id
       LEFT JOIN partners p ON p.id = rr.partner_id
       LEFT JOIN users u ON u.id = r.requested_by_user_id
       ORDER BY r.created_at DESC
       LIMIT 50`
    );

    res.json({ data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const exportDssAuditReport = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      throw new AppError(403, 'Only admins can export DSS audit runs');
    }

    const result = await query(
      `SELECT
         r.created_at,
         r.engine_version,
         rr.recommended_pathway,
         rr.rank,
         rr.score,
         rr.confidence,
         rr.explanation,
         s.submission_name,
         s.item_type,
         p.name AS partner_name,
         u.name AS requested_by_name,
         rr.output_payload
       FROM recommendation_results rr
       JOIN recommendation_runs r ON r.id = rr.run_id
       LEFT JOIN submissions s ON s.id = rr.submission_id
       LEFT JOIN partners p ON p.id = rr.partner_id
       LEFT JOIN users u ON u.id = r.requested_by_user_id
       ORDER BY r.created_at DESC
       LIMIT 500`
    );

    const header = [
      'created_at',
      'engine_version',
      'recommended_pathway',
      'rank',
      'score',
      'confidence',
      'submission_name',
      'item_type',
      'partner_name',
      'requested_by_name',
      'explanation',
      'matched_rules',
      'missed_rules',
    ];

    const rows = result.rows.map((row) => {
      const checks = row.output_payload?.rule_checks || [];
      const matched = checks
        .filter((check: any) => check.matched)
        .map((check: any) => check.question)
        .join('; ');
      const missed = checks
        .filter((check: any) => !check.matched)
        .map((check: any) => `${check.question} expected ${check.expected}, selected ${check.selected}`)
        .join('; ');

      return [
        row.created_at?.toISOString?.() || row.created_at,
        row.engine_version,
        row.recommended_pathway,
        row.rank,
        row.score,
        row.confidence,
        row.submission_name,
        row.item_type,
        row.partner_name,
        row.requested_by_name,
        row.explanation,
        matched,
        missed,
      ].map(csvCell).join(',');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clothcycle-dss-audit.csv"');
    res.send([header.join(','), ...rows].join('\n'));
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const createPartnerRuleChangeRequest = async (req: AuthRequest, res: Response) => {
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

    const result = await query(
      `INSERT INTO partner_rule_change_requests (
         id, partner_id, requested_by_user_id, rule_area, requested_change, reason
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        uuidv4(),
        partnerResult.rows[0]?.id || null,
        userId,
        req.body.rule_area,
        req.body.requested_change,
        req.body.reason || null,
      ]
    );

    const request = result.rows[0];
    const requesterResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const requesterName = requesterResult.rows[0]?.name || 'A partner';
    const adminResult = await query(
      `SELECT id FROM users WHERE role = 'admin' AND COALESCE(status, 'active') = 'active'`
    );

    await Promise.all(
      adminResult.rows.map(async (admin) => {
        const adminActionUrl = `/admin?panel=rule-requests&request=${request.id}&highlight=${request.id}`;

        await enqueueNotification(
          admin.id,
          'system',
          'Partner rule change request',
          `${requesterName} requested an update for ${req.body.rule_area}.`,
          { action_url: adminActionUrl, ruleChangeRequestId: request.id }
        );
      })
    );

    await enqueueNotification(
      userId,
      'system',
      'Rule request submitted',
      `Your ${req.body.rule_area} request was sent to admins.`,
      {
        action_url: `/partner?panel=rule-requests&highlight=${request.id}`,
        ruleChangeRequestId: request.id,
      }
    );

    res.status(201).json({ message: 'Rule change request submitted for admin review', data: result.rows[0] });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const getPartnerRuleChangeRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, 'User not authenticated');
    }

    let result;

    if (req.user.role === 'admin') {
      result = await query(
        `SELECT
           prcr.*,
           p.name AS partner_name,
           u.name AS requested_by_name,
           u.email AS requested_by_email
         FROM partner_rule_change_requests prcr
         LEFT JOIN partners p ON p.id = prcr.partner_id
         LEFT JOIN users u ON u.id = prcr.requested_by_user_id
         ORDER BY prcr.created_at DESC`
      );
    } else if (req.user.role === 'partner') {
      result = await query(
        `SELECT
           prcr.*,
           p.name AS partner_name,
           u.name AS requested_by_name,
           u.email AS requested_by_email
         FROM partner_rule_change_requests prcr
         LEFT JOIN partners p ON p.id = prcr.partner_id
         LEFT JOIN users u ON u.id = prcr.requested_by_user_id
         WHERE prcr.requested_by_user_id = $1
            OR p.user_id = $1
            OR lower(p.email) = lower($2)
         ORDER BY prcr.created_at DESC`,
        [req.user.id, req.user.email || '']
      );
    } else {
      throw new AppError(403, 'Only partners and admins can view partner rule change requests');
    }

    const requestIds = result.rows.map((row: any) => row.id);
    let repliesByRequest: Record<string, any[]> = {};

    if (requestIds.length > 0) {
      const repliesResult = await query(
        `SELECT
           r.*,
           u.name AS author_name,
           u.email AS author_email
         FROM partner_rule_change_request_replies r
         LEFT JOIN users u ON u.id = r.author_user_id
         WHERE r.request_id = ANY($1)
         ORDER BY r.created_at ASC`,
        [requestIds]
      );

      repliesByRequest = repliesResult.rows.reduce((groups: Record<string, any[]>, reply: any) => {
        groups[reply.request_id] = [...(groups[reply.request_id] || []), reply];
        return groups;
      }, {});
    }

    const rows = result.rows.map((row: any) => ({
      ...row,
      replies: repliesByRequest[row.id] || [],
    }));

    res.json({ data: rows, count: rows.length });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const replyToPartnerRuleChangeRequest = async (req: AuthRequest, res: Response) => {
  const client = await getClient();

  try {
    if (!req.user?.id) {
      throw new AppError(401, 'User not authenticated');
    }

    if (!['partner', 'admin'].includes(String(req.user.role))) {
      throw new AppError(403, 'Only related partners and admins can reply to partner rule requests');
    }

    const { id } = req.params;
    const message = String(req.body.message || '').trim();

    if (!message) {
      throw new AppError(400, 'Reply message is required');
    }

    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT prcr.*, p.user_id AS partner_user_id, p.email AS partner_email
       FROM partner_rule_change_requests prcr
       LEFT JOIN partners p ON p.id = prcr.partner_id
       WHERE prcr.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      throw new AppError(404, 'Partner rule change request not found');
    }

    const request = requestResult.rows[0];
    const isRelatedPartner =
      req.user.role === 'partner' &&
      (request.requested_by_user_id === req.user.id ||
        request.partner_user_id === req.user.id ||
        String(request.partner_email || '').toLowerCase() === String(req.user.email || '').toLowerCase());

    if (req.user.role !== 'admin' && !isRelatedPartner) {
      throw new AppError(403, 'You can reply only to your own partner rule request');
    }

    if (req.user.role === 'partner' && ['accepted', 'approved', 'declined'].includes(String(request.status))) {
      throw new AppError(400, 'Replies are disabled after the request is accepted or declined');
    }

    const replyResult = await client.query(
      `INSERT INTO partner_rule_change_request_replies (request_id, author_user_id, author_role, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.user.id, req.user.role, message]
    );

    await client.query(
      `UPDATE partner_rule_change_requests
       SET updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    const authorResult = await client.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const authorName = authorResult.rows[0]?.name || authorResult.rows[0]?.email || (req.user.role === 'admin' ? 'Admin' : 'Partner');

    if (req.user.role === 'partner') {
      const admins = await client.query(`SELECT id FROM users WHERE role = 'admin' AND COALESCE(status, 'active') = 'active'`);
      await Promise.all(admins.rows.map((admin: any) =>
        enqueueNotification(
          admin.id,
          'system',
          'Partner added details',
          `${authorName} replied to a partner rule request.`,
          { action_url: `/admin?panel=rule-requests&request=${id}&highlight=${id}`, ruleChangeRequestId: id }
        )
      ));
    } else {
      const partnerUsers = await client.query(
        `SELECT DISTINCT u.id
         FROM users u
         WHERE u.id = $1 OR u.partner_id = $2`,
        [request.requested_by_user_id, request.partner_id]
      );
      await Promise.all(partnerUsers.rows.map((partnerUser: any) =>
        enqueueNotification(
          partnerUser.id,
          'system',
          'Admin replied to rule request',
          `${authorName} replied to your partner rule request.`,
          { action_url: `/partner?panel=rule-requests&highlight=${id}`, ruleChangeRequestId: id }
        )
      ));
    }

    await client.query('COMMIT');

    res.status(201).json({ message: 'Reply saved', data: { ...replyResult.rows[0], author_name: authorName } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
};

export const updatePartnerRuleChangeRequestStatus = async (req: AuthRequest, res: Response) => {
  const client = await getClient();

  try {
    if (req.user?.role !== 'admin') {
      throw new AppError(403, 'Only admins can update partner rule change requests');
    }

    const { id } = req.params;
    const status = String(req.body.status || '').trim();
    const adminNote = String(req.body.admin_note || '').trim();
    const allowedStatuses = ['pending', 'accepted', 'declined', 'needs_more_information'];

    if (!allowedStatuses.includes(status)) {
      throw new AppError(400, 'Invalid rule request status');
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE partner_rule_change_requests
       SET status = $1,
           admin_notes = $2,
           reviewed_by_user_id = $3,
           reviewed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, adminNote || null, req.user.id, id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Partner rule change request not found');
    }

    const request = result.rows[0];
    const partnerUserResult = await client.query(
      `SELECT u.id, u.name
       FROM users u
       WHERE u.partner_id = $1 OR u.id = $2`,
      [request.partner_id, request.requested_by_user_id]
    );
    const adminResult = await client.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const adminName = adminResult.rows[0]?.name || adminResult.rows[0]?.email || 'Admin';
    const partnerActionUrl = `/partner?panel=rule-requests&highlight=${request.id}`;
    const statusLabel = status === 'needs_more_information' ? 'needs more information' : status;

    for (const partnerUser of partnerUserResult.rows) {
      await enqueueNotification(
        partnerUser.id,
        'system',
        'Rule request updated',
        `${adminName} marked your partner rule request as ${statusLabel}.`,
        { action_url: partnerActionUrl, ruleChangeRequestId: request.id }
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Rule request status updated', data: request });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error instanceof AppError ? error.statusCode : 400).json({ error: (error as Error).message });
  } finally {
    client.release();
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
    const senderResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const senderName = senderResult.rows[0]?.name || 'The user';

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
        req.body.message || `${senderName} is waiting for your response to a ${titleCase(request.type)} request.`,
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
