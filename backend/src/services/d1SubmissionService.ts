import { D1Database, executeD1, queryD1, queryD1First, generateD1UUID } from '../config/d1.js';

export async function createSubmissionD1(
  db: D1Database,
  userId: string,
  payload: {
    item_type: string;
    condition: string;
    fabric?: string | null;
    cleanliness?: string | null;
    description?: string | null;
    photos?: unknown[];
    service_type?: 'recycle' | 'donate' | 'upcycle' | 'buyback' | null;
    quantity?: number | null;
    buyback_interest?: boolean;
    action?: string | null;
    scheduled_at?: string | Date | null;
    details?: {
      item_types?: unknown[];
      other_item_type?: string | null;
      condition?: string | null;
      cleanliness?: string | null;
      knows_fabric_type?: boolean | null;
      fabric_types?: unknown[];
      custom_fabric_text?: string | null;
      fabric_identification?: unknown[];
      brand?: string | null;
      no_brand_visible?: boolean;
      fabric_description?: unknown[];
      restricted_category?: string | null;
      fiber_composition?: string | null;
      wearability?: string | null;
      repairability?: string | null;
      contamination_level?: string | null;
      damage_classification?: string | null;
      repurposing_potential?: string | null;
      trim_removal?: string | null;
    };
    burn_test?: {
      performed?: boolean;
      page?: number | null;
      moment?: unknown[];
      flames?: unknown[];
      no_flame?: unknown[];
      smell?: string | null;
      ashes?: unknown[];
    };
  }
) {
  const id = generateD1UUID();
  const result = await executeD1(
    db,
    `INSERT INTO submissions (
       id, user_id, item_type, condition, fabric, cleanliness, description,
       photos, status, service_type, quantity, buyback_interest, action, scheduled_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      id,
      userId,
      payload.item_type,
      payload.condition,
      payload.fabric || null,
      payload.cleanliness || null,
      payload.description || null,
      JSON.stringify(payload.photos || []),
      payload.service_type || null,
      payload.quantity || 1,
      payload.buyback_interest ? 1 : 0,
      payload.action || null,
      payload.scheduled_at ? new Date(payload.scheduled_at).toISOString() : null,
    ]
  );

  if (payload.details) {
    await executeD1(
      db,
      `INSERT INTO submission_details (
         id, submission_id, item_types, other_item_type, condition, cleanliness,
         knows_fabric_type, fabric_types, custom_fabric_text, fabric_identification, brand,
         no_brand_visible, fabric_description, restricted_category, fiber_composition,
         wearability, repairability, contamination_level, damage_classification,
         repurposing_potential, trim_removal
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateD1UUID(),
        id,
        jsonText(payload.details.item_types),
        payload.details.other_item_type || null,
        payload.details.condition || null,
        payload.details.cleanliness || null,
        payload.details.knows_fabric_type ? 1 : 0,
        jsonText(payload.details.fabric_types),
        payload.details.custom_fabric_text || null,
        jsonText(payload.details.fabric_identification),
        payload.details.brand || null,
        payload.details.no_brand_visible ? 1 : 0,
        jsonText(payload.details.fabric_description),
        payload.details.restricted_category || 'none',
        payload.details.fiber_composition || null,
        payload.details.wearability || null,
        payload.details.repairability || null,
        payload.details.contamination_level || null,
        payload.details.damage_classification || null,
        payload.details.repurposing_potential || null,
        payload.details.trim_removal || null,
      ]
    );
  }

  if (payload.burn_test) {
    await executeD1(
      db,
      `INSERT INTO burn_tests (
         id, submission_id, performed, page, moment, flames, no_flame, smell, ashes
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateD1UUID(),
        id,
        payload.burn_test.performed ? 1 : 0,
        payload.burn_test.page || null,
        jsonText(payload.burn_test.moment),
        jsonText(payload.burn_test.flames),
        jsonText(payload.burn_test.no_flame),
        payload.burn_test.smell || null,
        jsonText(payload.burn_test.ashes),
      ]
    );
  }

  return normalizeSubmission(result?.results?.[0]);
}

export async function getUserSubmissionsD1(db: D1Database, userId: string) {
  const result = await queryD1(db, 'SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return {
    ...result,
    results: result.results?.map(normalizeSubmission),
  };
}

export async function getSubmissionByIdD1(db: D1Database, id: string) {
  return normalizeSubmission(await queryD1First(db, 'SELECT * FROM submissions WHERE id = ?', [id]));
}

export async function updateSubmissionStatusD1(db: D1Database, id: string, status: string) {
  return normalizeSubmission(await queryD1First(
    db,
    'UPDATE submissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *',
    [status, id]
  ));
}

function normalizeSubmission(row: any) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    photos: parseJsonArray(row.photos),
    quantity: row.quantity == null ? row.quantity : Number(row.quantity),
    buyback_interest: Boolean(row.buyback_interest),
  };
}

function jsonText(value: unknown) {
  if (value == null) {
    return null;
  }

  return JSON.stringify(value);
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
