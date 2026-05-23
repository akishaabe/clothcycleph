import { D1Database, executeD1, generateD1UUID, queryD1, queryD1First } from '../config/d1.js';
import { analyzeBurnTest, buildPathwayRecommendations, DSS_ENGINE_VERSION, evaluateEligibility } from './dssEngine.js';
import { createNotificationD1 } from './d1NotificationService.js';
import { listPartnerLocationsD1, PartnerSearchOptions } from './d1GisService.js';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  completed: 'Completed',
  rejected: 'Rejected',
};

const bagColorByPathway: Record<string, string> = {
  recycle: 'white',
  upcycle: 'black',
  donate: 'green',
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

export async function listDssPartnersD1(db: D1Database, options: PartnerSearchOptions = {}) {
  return listPartnerLocationsD1(db, options);
}

export async function getSubmissionDssD1(db: D1Database, submissionId: string, userId: string, role?: string) {
  const submission = await getSubmissionForUserD1(db, submissionId, userId, role);
  const recommendations = buildPathwayRecommendations(submission);
  const burn_test_analysis = analyzeBurnTest(submission.burn_test);

  return {
    submission,
    recommendations,
    burn_test_analysis,
    brief: buildBrief(submission, recommendations[0]),
  };
}

export async function sendRecommendationToPartnerD1(
  db: D1Database,
  userId: string,
  role: string | undefined,
  payload: {
    submission_id: string;
    partner_id: string;
    recommended_pathway: 'recycle' | 'donate' | 'upcycle';
    buyback_interest?: boolean;
    estimated_distance_km?: number | null;
    estimated_carbon_kg?: number | null;
    brief: string;
  }
) {
  const submission = await getSubmissionForUserD1(db, payload.submission_id, userId, role);
  const eligibility = evaluateEligibility(submission);
  if (!eligibility.eligible) {
    throw new Error(eligibility.message || 'This submission is not eligible for partner recommendation.');
  }

  const partner = await queryD1First(
    db,
    `SELECT id, name, user_id
     FROM partners
     WHERE id = ? AND COALESCE(status, 'active') IN ('active', 'pending')`,
    [payload.partner_id]
  );

  if (!partner) {
    throw new Error('Partner not found');
  }

  const recommendations = buildPathwayRecommendations(submission);
  const recommendation =
    recommendations.find((item) => item.recommended_pathway === payload.recommended_pathway) || recommendations[0];
  const selectedBuybackInterest = payload.recommended_pathway === 'upcycle' && Boolean(payload.buyback_interest);

  const runId = generateD1UUID();
  await executeD1(
    db,
    `INSERT INTO recommendation_runs (
       id, submission_id, requested_by_user_id, engine_name, engine_version,
       status, criteria, input_snapshot, completed_at
     )
     VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, CURRENT_TIMESTAMP)`,
    [
      runId,
      payload.submission_id,
      userId,
      'dss',
      DSS_ENGINE_VERSION,
      JSON.stringify({ selected_partner_id: payload.partner_id, selected_pathway: payload.recommended_pathway }),
      JSON.stringify(submission),
    ]
  );

  const resultId = generateD1UUID();
  await executeD1(
    db,
    `INSERT INTO recommendation_results (
       id, run_id, submission_id, partner_id, recommended_pathway,
       rank, score, confidence, explanation, details, output_payload, selected
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      resultId,
      runId,
      payload.submission_id,
      payload.partner_id,
      payload.recommended_pathway,
      recommendation.rank,
      recommendation.score,
      recommendation.confidence,
      recommendation.explanation,
      payload.brief,
      JSON.stringify({
        engine_version: DSS_ENGINE_VERSION,
        recommendation,
        recommendations,
        brief: payload.brief,
        buyback_interest: selectedBuybackInterest,
        bag_color: bagColorByPathway[payload.recommended_pathway],
        estimated_distance_km: payload.estimated_distance_km ?? null,
        estimated_carbon_kg: payload.estimated_carbon_kg ?? null,
        burn_test_analysis: analyzeBurnTest(submission.burn_test),
        rule_checks: recommendation.checks || [],
      }),
    ]
  );

  const transactionId = generateD1UUID();
  const transaction = await executeD1(
    db,
    `INSERT INTO transactions (
       id, submission_id, from_user_id, to_partner_id, type, status, notes,
       bag_color, estimated_distance_km, estimated_carbon_kg
     )
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
     RETURNING *`,
    [
      transactionId,
      payload.submission_id,
      userId,
      payload.partner_id,
      payload.recommended_pathway,
      payload.brief,
      bagColorByPathway[payload.recommended_pathway],
      payload.estimated_distance_km ?? null,
      payload.estimated_carbon_kg ?? null,
    ]
  );

  await executeD1(
    db,
    `UPDATE submissions
     SET assigned_partner_id = ?,
         service_type = ?,
         buyback_interest = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [payload.partner_id, payload.recommended_pathway, selectedBuybackInterest ? 1 : 0, payload.submission_id]
  );

  if (partner.user_id) {
    const sender = await queryD1First(db, 'SELECT name FROM users WHERE id = ?', [userId]);
    await createNotificationD1(db, {
      userId: partner.user_id,
      type: 'partner_update',
      title: 'New textile request',
      body: `${sender?.name || 'A user'} sent a ${titleCase(payload.recommended_pathway)} request for your review.`,
      data: { submissionId: payload.submission_id, transactionId },
    });
  }

  await createNotificationD1(db, {
    userId,
    type: 'partner_update',
    title: 'Request sent to partner',
    body: `Your textile brief was sent to ${partner.name}.`,
    data: { submissionId: payload.submission_id, transactionId },
  });

  return {
    transaction: transaction.results?.[0] ?? null,
    recommendation_result_id: resultId,
    recommendation_run_id: runId,
  };
}

export async function getDssAuditRunsD1(db: D1Database) {
  const result = await queryD1(
    db,
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

  return {
    ...result,
    results: result.results?.map((row: any) => ({
      ...row,
      output_payload: parseJsonObject(row.output_payload),
    })),
  };
}

export async function createPartnerRuleChangeRequestD1(
  db: D1Database,
  userId: string,
  email: string | undefined,
  payload: { rule_area: string; requested_change: string; reason?: string }
) {
  const partner = await queryD1First(db, 'SELECT id FROM partners WHERE user_id = ? OR lower(email) = lower(?)', [
    userId,
    email || '',
  ]);

  const id = generateD1UUID();
  const result = await executeD1(
    db,
    `INSERT INTO partner_rule_change_requests (
       id, partner_id, requested_by_user_id, rule_area, requested_change, reason
     )
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [id, partner?.id || null, userId, payload.rule_area, payload.requested_change, payload.reason || null]
  );

  const request = result.results?.[0] ?? null;
  const requester = await queryD1First(db, 'SELECT name FROM users WHERE id = ?', [userId]);
  const admins = await queryD1(db, `SELECT id FROM users WHERE role = 'admin' AND COALESCE(status, 'active') = 'active'`);

  await Promise.all(
    (admins.results || []).map(async (admin: any) => {
      const adminActionUrl = `/admin?panel=rule-requests&request=${id}&highlight=${id}`;
      await createNotificationD1(db, {
        userId: admin.id,
        type: 'system',
        title: 'Partner rule change request',
        body: `${requester?.name || 'A partner'} requested an update for ${payload.rule_area}.`,
        data: { action_url: adminActionUrl, ruleChangeRequestId: id },
      });
    })
  );

  await createNotificationD1(db, {
    userId,
    type: 'system',
    title: 'Rule request submitted',
    body: `Your ${payload.rule_area} request was sent to admins.`,
    data: {
      action_url: `/partner?panel=rule-requests&highlight=${id}`,
      ruleChangeRequestId: id,
    },
  });

  return request;
}

export async function getPartnerRuleChangeRequestsD1(
  db: D1Database,
  user?: { id?: string; email?: string; role?: string }
) {
  if (user?.role === 'partner') {
    return queryD1(
      db,
      `SELECT
         prcr.*,
         p.name AS partner_name,
         u.name AS requested_by_name,
         u.email AS requested_by_email
       FROM partner_rule_change_requests prcr
       LEFT JOIN partners p ON p.id = prcr.partner_id
       LEFT JOIN users u ON u.id = prcr.requested_by_user_id
       WHERE prcr.requested_by_user_id = ?
          OR p.user_id = ?
          OR lower(p.email) = lower(?)
       ORDER BY prcr.created_at DESC`,
      [user.id || '', user.id || '', user.email || '']
    );
  }

  return queryD1(
    db,
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
}

export async function updatePartnerRuleChangeRequestStatusD1(
  db: D1Database,
  adminUserId: string,
  requestId: string,
  payload: { status: string; admin_note?: string }
) {
  const allowedStatuses = ['pending', 'accepted', 'approved', 'declined', 'needs_more_information'];
  if (!allowedStatuses.includes(payload.status)) {
    throw new Error('Invalid rule request status');
  }

  const result = await executeD1(
    db,
    `UPDATE partner_rule_change_requests
     SET status = ?,
         admin_notes = ?,
         reviewed_by_user_id = ?,
         reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
     RETURNING *`,
    [payload.status, payload.admin_note || null, adminUserId, requestId]
  );
  const request: any = result.results?.[0];

  if (!request) {
    throw new Error('Partner rule change request not found');
  }

  const partnerUsers = await queryD1(
    db,
    `SELECT DISTINCT u.id
     FROM users u
     WHERE u.id = ? OR u.partner_id = ?`,
    [request.requested_by_user_id, request.partner_id || '']
  );
  const admin = await queryD1First(db, 'SELECT name, email FROM users WHERE id = ?', [adminUserId]);
  const partnerActionUrl = `/partner?panel=rule-requests&highlight=${request.id}`;
  const statusLabel = payload.status === 'needs_more_information' ? 'needs more information' : payload.status;

  await Promise.all(
    (partnerUsers.results || []).map(async (partnerUser: any) => {
      await createNotificationD1(db, {
        userId: partnerUser.id,
        type: 'system',
        title: 'Rule request updated',
        body: `${admin?.name || admin?.email || 'Admin'} marked your partner rule request as ${statusLabel}.`,
        data: { action_url: partnerActionUrl, ruleChangeRequestId: request.id },
      });
    })
  );

  return request;
}

export async function getUserDssRequestsD1(db: D1Database, userId: string) {
  const result = await queryD1(
    db,
    `SELECT
       t.*,
       p.name AS partner_name,
       p.email AS partner_email,
       p.latitude AS partner_latitude,
       p.longitude AS partner_longitude,
       s.item_type,
       s.quantity,
       sd.weight_value,
       sd.weight_unit,
       s.condition,
       s.cleanliness,
       s.submission_name,
       rr.confidence,
       rr.score,
       rr.explanation,
       rr.output_payload
     FROM transactions t
     JOIN partners p ON p.id = t.to_partner_id
     JOIN submissions s ON s.id = t.submission_id
     LEFT JOIN submission_details sd ON sd.submission_id = s.id
     LEFT JOIN recommendation_results rr ON rr.submission_id = s.id AND rr.partner_id = p.id AND rr.selected = 1
     WHERE t.from_user_id = ?
     ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.created_at DESC`,
    [userId]
  );

  return { ...result, results: result.results?.map(normalizeRequest) };
}

export async function getPartnerDssRequestsD1(db: D1Database, userId: string, email: string | undefined, role?: string) {
  const partner = await queryD1First(db, 'SELECT id FROM partners WHERE user_id = ? OR lower(email) = lower(?)', [
    userId,
    email || '',
  ]);

  if (!partner && role !== 'admin') {
    throw new Error('Partner profile not found');
  }

  const whereClause = role === 'admin' ? '' : 'WHERE t.to_partner_id = ?';
  const params = role === 'admin' ? [] : [partner.id];
  const result = await queryD1(
    db,
    `SELECT
       t.*,
       s.item_type,
       s.quantity,
       sd.weight_value,
       sd.weight_unit,
       s.condition,
       s.cleanliness,
       s.fabric,
       s.description,
       s.buyback_interest,
       s.photos,
       sd.item_types,
       sd.other_item_type,
       sd.knows_fabric_type,
       sd.fabric_types,
       sd.custom_fabric_text,
       sd.fabric_identification,
       sd.brand,
       sd.no_brand_visible,
       sd.fabric_description,
       sd.restricted_category,
       sd.uniform_branding,
       sd.fiber_composition,
       sd.wearability,
       sd.repairability,
       sd.contamination_level,
       sd.damage_classification,
       sd.repurposing_potential,
       sd.trim_removal,
       sd.weight_value,
       sd.weight_unit,
       bt.performed AS burn_performed,
       bt.page AS burn_page,
       bt.moment AS burn_moment,
       bt.flames AS burn_flames,
       bt.no_flame AS burn_no_flame,
       bt.smell AS burn_smell,
       bt.ashes AS burn_ashes,
       u.name AS user_name,
       u.email AS user_email,
       rr.confidence,
       rr.explanation,
       rr.output_payload
     FROM transactions t
     JOIN submissions s ON s.id = t.submission_id
     JOIN users u ON u.id = t.from_user_id
     LEFT JOIN submission_details sd ON sd.submission_id = s.id
     LEFT JOIN burn_tests bt ON bt.id = (
       SELECT id FROM burn_tests WHERE submission_id = s.id ORDER BY created_at DESC LIMIT 1
     )
     LEFT JOIN recommendation_results rr ON rr.submission_id = s.id AND rr.partner_id = t.to_partner_id AND rr.selected = 1
     ${whereClause}
     ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.created_at DESC`,
    params
  );

  return { ...result, results: result.results?.map(normalizePartnerRequest) };
}

export async function updateDssRequestStatusD1(
  db: D1Database,
  userId: string,
  email: string | undefined,
  role: string | undefined,
  requestId: string,
  status: string,
  notes?: string,
  outcomeTitle?: string,
  outcomeDescription?: string,
  outcomePhotos?: string[]
) {
  const normalizedStatus = normalizeRequestStatus(status);
  const transaction = await queryD1First(
    db,
    `SELECT t.*, p.user_id AS partner_user_id, p.email AS partner_email,
            COALESCE(s.submission_name, s.item_type, 'textile') AS submission_label
     FROM transactions t
     JOIN partners p ON p.id = t.to_partner_id
     JOIN submissions s ON s.id = t.submission_id
     WHERE t.id = ?`,
    [requestId]
  );

  if (!transaction) {
    throw new Error('Request not found');
  }

  if (
    role !== 'admin' &&
    transaction.partner_user_id !== userId &&
    normalizeText(transaction.partner_email) !== normalizeText(email)
  ) {
    throw new Error('You do not have permission to update this request');
  }

  const serializedOutcomePhotos = outcomePhotos == null ? null : JSON.stringify(outcomePhotos || []);
  const result = await executeD1(
    db,
    `UPDATE transactions
     SET status = ?,
         notes = COALESCE(?, notes),
         outcome_title = COALESCE(?, outcome_title),
         outcome_description = COALESCE(?, outcome_description),
         outcome_photos = CASE
           WHEN ? IS NOT NULL THEN ?
           ELSE outcome_photos
         END,
         outcome_reported_at = CASE
           WHEN ? IS NOT NULL OR ? IS NOT NULL OR ? IS NOT NULL THEN CURRENT_TIMESTAMP
           ELSE outcome_reported_at
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
     RETURNING *`,
    [
      normalizedStatus,
      notes || null,
      outcomeTitle || null,
      outcomeDescription || null,
      serializedOutcomePhotos,
      serializedOutcomePhotos,
      outcomeTitle || null,
      outcomeDescription || null,
      serializedOutcomePhotos,
      requestId,
    ]
  );

  const outcomeCelebration =
    normalizedStatus === 'completed' && outcomeTitle
      ? `Congratulations! Your ${transaction.submission_label || 'textile'} was turned into ${outcomeTitle}!`
      : '';

  await executeD1(
    db,
    `INSERT INTO messages (
       id, from_user_id, to_user_id, content,
       related_submission_id, related_transaction_id, action_url, metadata
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateD1UUID(),
      userId,
      transaction.from_user_id,
      normalizedStatus === 'completed' && (outcomeTitle || outcomeDescription)
        ? `${outcomeCelebration || 'Your textile has a new story!'}\n${
            outcomeDescription || 'Your partner shared what happened to your textile.'
          }`
        : `Partner decision: ${statusLabels[normalizedStatus] || normalizedStatus}\n${
            notes ? `Message to user: ${notes}` : 'No additional message provided.'
          }`,
      transaction.submission_id,
      transaction.id,
      `/dss/${transaction.submission_id}?request=${transaction.id}`,
      JSON.stringify({
        kind: 'dss_status_update',
        status: normalizedStatus,
        submission_id: transaction.submission_id,
        transaction_id: transaction.id,
        outcome_title: outcomeTitle || null,
        outcome_photos: outcomePhotos || [],
        celebration: outcomeCelebration || null,
      }),
    ]
  );

  await createNotificationD1(db, {
    userId: transaction.from_user_id,
    type: normalizedStatus === 'rejected' ? 'submission_rejected' : 'submission_approved',
    title:
      normalizedStatus === 'completed'
        ? 'Congratulations! Your textile has a new life'
        : `Partner ${normalizedStatus === 'rejected' ? 'rejected' : 'updated'} your request`,
    body: outcomeTitle
      ? outcomeCelebration
      : `Your ${titleCase(transaction.type)} request is now ${statusLabels[normalizedStatus] || normalizedStatus}.`,
    data: { submissionId: transaction.submission_id, transactionId: transaction.id, status: normalizedStatus },
  });

  return result.results?.[0] ?? null;
}

export async function remindDssRequestD1(
  db: D1Database,
  userId: string,
  requestId: string,
  message?: string
) {
  const request = await queryD1First(
    db,
    `SELECT t.*, p.name AS partner_name, p.user_id AS partner_user_id
     FROM transactions t
     JOIN partners p ON p.id = t.to_partner_id
     WHERE t.id = ? AND t.from_user_id = ?`,
    [requestId, userId]
  );

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('Only pending requests can receive reminders');
  }

  const sender = await queryD1First(db, 'SELECT name FROM users WHERE id = ?', [userId]);

  const result = await executeD1(
    db,
    `UPDATE transactions
     SET updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
     RETURNING *`,
    [requestId]
  );

  if (request.partner_user_id) {
    await createNotificationD1(db, {
      userId: request.partner_user_id,
      type: 'partner_update',
      title: 'Reminder: textile request pending',
      body: message || `${sender?.name || 'The user'} is waiting for your response to a ${titleCase(request.type)} request.`,
      data: { submissionId: request.submission_id, transactionId: request.id },
    });
  }

  return {
    partnerName: request.partner_name,
    request: result.results?.[0] ?? null,
  };
}

async function getSubmissionForUserD1(db: D1Database, submissionId: string, userId: string, role?: string) {
  const submission = await queryD1First(
    db,
    `SELECT
       s.*,
       sd.item_types,
       sd.other_item_type,
       sd.knows_fabric_type,
       sd.fabric_types,
       sd.custom_fabric_text,
       sd.fabric_identification,
       sd.brand,
       sd.no_brand_visible,
       sd.fabric_description,
       sd.restricted_category,
       sd.uniform_branding,
       sd.fiber_composition,
       sd.wearability,
       sd.repairability,
       sd.contamination_level,
       sd.damage_classification,
       sd.repurposing_potential,
       sd.trim_removal,
       sd.weight_value,
       sd.weight_unit,
       bt.performed AS burn_performed,
       bt.page AS burn_page,
       bt.moment AS burn_moment,
       bt.flames AS burn_flames,
       bt.no_flame AS burn_no_flame,
       bt.smell AS burn_smell,
       bt.ashes AS burn_ashes
     FROM submissions s
     LEFT JOIN submission_details sd ON sd.submission_id = s.id
     LEFT JOIN burn_tests bt ON bt.id = (
       SELECT id FROM burn_tests WHERE submission_id = s.id ORDER BY created_at DESC LIMIT 1
     )
     WHERE s.id = ? AND (s.user_id = ? OR ? = 'admin')`,
    [submissionId, userId, role || '']
  );

  if (!submission) {
    throw new Error('Submission not found');
  }

  return normalizeSubmissionForDss(submission);
}

function normalizeSubmissionForDss(row: any) {
  return {
    ...row,
    photos: parseJsonArray(row.photos),
    quantity: row.quantity == null ? 1 : Number(row.quantity),
    buyback_interest: Boolean(row.buyback_interest),
    details: {
      item_types: parseJsonArray(row.item_types),
      other_item_type: row.other_item_type,
      condition: row.condition,
      cleanliness: row.cleanliness,
      knows_fabric_type: Boolean(row.knows_fabric_type),
      fabric_types: parseJsonArray(row.fabric_types),
      custom_fabric_text: row.custom_fabric_text,
      fabric_identification: parseJsonArray(row.fabric_identification),
      brand: row.brand,
      no_brand_visible: Boolean(row.no_brand_visible),
      fabric_description: parseJsonArray(row.fabric_description),
      restricted_category: row.restricted_category || 'none',
      uniform_branding: row.uniform_branding,
      fiber_composition: row.fiber_composition,
      wearability: row.wearability,
      repairability: row.repairability,
      contamination_level: row.contamination_level,
      damage_classification: row.damage_classification,
      repurposing_potential: row.repurposing_potential,
      trim_removal: row.trim_removal,
      weight_value: row.weight_value == null ? null : Number(row.weight_value),
      weight_unit: row.weight_unit || 'kg',
    },
    burn_test: {
      performed: Boolean(row.burn_performed),
      page: row.burn_page,
      moment: parseJsonArray(row.burn_moment),
      flames: parseJsonArray(row.burn_flames),
      no_flame: parseJsonArray(row.burn_no_flame),
      smell: row.burn_smell,
      ashes: parseJsonArray(row.burn_ashes),
    },
  };
}

function normalizeRequest(row: any) {
  const status = normalizeRequestStatus(row.status);
  return {
    ...row,
    status,
    status_label: statusLabels[status] || status,
    confidence: row.confidence == null ? null : Number(row.confidence),
    score: row.score == null ? null : Number(row.score),
    output_payload: parseJsonObject(row.output_payload),
    partner_latitude: row.partner_latitude == null ? null : Number(row.partner_latitude),
    partner_longitude: row.partner_longitude == null ? null : Number(row.partner_longitude),
    estimated_distance_km: row.estimated_distance_km == null ? null : Number(row.estimated_distance_km),
    estimated_carbon_kg: row.estimated_carbon_kg == null ? null : Number(row.estimated_carbon_kg),
    outcome_photos: parseJsonArray(row.outcome_photos),
  };
}

function normalizePartnerRequest(row: any) {
  const normalized = normalizeRequest(row);
  return {
    ...normalized,
    photos: parseJsonArray(row.photos),
    output_payload: parseJsonObject(row.output_payload),
    status_label: statusLabels[normalized.status] || normalized.status,
    details: {
      item_types: parseJsonArray(row.item_types),
      item_types_list: parseJsonArray(row.item_types),
      other_item_type: row.other_item_type,
      knows_fabric_type: Boolean(row.knows_fabric_type),
      fabric_types: parseJsonArray(row.fabric_types),
      fabric_types_list: parseJsonArray(row.fabric_types),
      custom_fabric_text: row.custom_fabric_text,
      fabric_identification: parseJsonArray(row.fabric_identification),
      brand: row.brand,
      no_brand_visible: Boolean(row.no_brand_visible),
      fabric_description: parseJsonArray(row.fabric_description),
      fabric_description_list: parseJsonArray(row.fabric_description),
      restricted_category: row.restricted_category || 'none',
      uniform_branding: row.uniform_branding,
      fiber_composition: row.fiber_composition,
      wearability: row.wearability,
      repairability: row.repairability,
      contamination_level: row.contamination_level,
      damage_classification: row.damage_classification,
      repurposing_potential: row.repurposing_potential,
      trim_removal: row.trim_removal,
      weight_value: row.weight_value == null ? null : Number(row.weight_value),
      weight_unit: row.weight_unit || 'kg',
    },
    burn_test: {
      performed: Boolean(row.burn_performed),
      page: row.burn_page,
      moment: parseJsonArray(row.burn_moment),
      flames: parseJsonArray(row.burn_flames),
      no_flame: parseJsonArray(row.burn_no_flame),
      smell: row.burn_smell,
      ashes: parseJsonArray(row.burn_ashes),
    },
  };
}

function buildBrief(submission: any, recommendation: any) {
  const details = submission.details || {};
  const burnTest = submission.burn_test || {};
  if (recommendation?.recommended_pathway === 'rejected') {
    return [
      'Eligibility status: Rejected',
      `Restricted category: ${details.restricted_category || recommendation.eligibility?.reason || 'Not specified'}`,
      `Reason: ${recommendation.explanation}`,
      'DSS evaluation stopped before donation, upcycling, or recycling recommendations.',
    ].join('\n');
  }

  const lines = [
    `Recommended pathway: ${titleCase(recommendation.recommended_pathway)} (${Math.round(recommendation.confidence * 100)}% confidence)`,
    `Item: ${submission.item_type}`,
    `Quantity: ${submission.quantity || 1}`,
    details.weight_value ? `Weight: ${details.weight_value} ${details.weight_unit || 'kg'}` : '',
    `Shipping bag: ${titleCase(bagColorByPathway[recommendation.recommended_pathway])} bag for ${titleCase(recommendation.recommended_pathway)}`,
    `Condition: ${submission.condition}`,
    `Cleanliness: ${submission.cleanliness || 'Not specified'}`,
    `Fabric: ${submission.fabric || details.fabric_types?.join(', ') || details.fabric_description?.join(', ') || 'Not specified'}`,
    `Fabric identified by: ${details.fabric_identification?.join(', ') || 'Not specified'}`,
    `Brand: ${details.no_brand_visible ? 'No brand visible' : details.brand || 'Not specified'}`,
    `Burn test: ${burnTest.performed ? 'Performed' : 'Not performed'}`,
  ].filter(Boolean);

  if (burnTest.performed) {
    lines.push(`Burn observations: ${[
      burnTest.moment?.join(', '),
      burnTest.flames?.join(', '),
      burnTest.no_flame?.join(', '),
      burnTest.smell,
      burnTest.ashes?.join(', '),
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

function splitText(value?: string | null) {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || value.length === 0) {
    return splitText(value as string);
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : splitText(value);
  } catch {
    return splitText(value);
  }
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
