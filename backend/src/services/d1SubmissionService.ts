import { D1Database, executeD1, queryD1, queryD1First, generateD1UUID } from '../config/d1.js';

export async function createSubmissionD1(
  db: D1Database,
  userId: string,
  payload: {
    submission_name?: string | null;
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
    upcycle_request?: string | null;
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
      uniform_branding?: string | null;
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
       photos, status, service_type, quantity, buyback_interest, action,
       submission_name, upcycle_request, scheduled_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
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
      payload.submission_name || null,
      payload.upcycle_request || null,
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
         uniform_branding, wearability, repairability, contamination_level, damage_classification,
         repurposing_potential, trim_removal
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        payload.details.uniform_branding || null,
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

  await saveSubmissionImages(db, id, payload.photos || []);

  return normalizeSubmission(result?.results?.[0]);
}

export async function getUserSubmissionsD1(db: D1Database, userId: string) {
  const result = await queryD1(db, 'SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  const submissions = await Promise.all((result.results || []).map((row) => hydrateSubmission(db, row)));
  return {
    ...result,
    results: submissions,
  };
}

export async function getSubmissionByIdD1(db: D1Database, id: string) {
  const submission = await queryD1First(db, 'SELECT * FROM submissions WHERE id = ?', [id]);
  return hydrateSubmission(db, submission);
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

async function hydrateSubmission(db: D1Database, row: any) {
  const submission = normalizeSubmission(row);
  if (!submission) {
    return null;
  }

  const [details, burnTest] = await Promise.all([
    queryD1First(db, 'SELECT * FROM submission_details WHERE submission_id = ?', [submission.id]),
    queryD1First(db, 'SELECT * FROM burn_tests WHERE submission_id = ? ORDER BY created_at DESC LIMIT 1', [
      submission.id,
    ]),
  ]);

  return {
    ...submission,
    details: normalizeDetails(details),
    burn_test: normalizeBurnTest(burnTest),
  };
}

function normalizeDetails(row: any) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    knows_fabric_type: row.knows_fabric_type == null ? null : Boolean(row.knows_fabric_type),
    no_brand_visible: Boolean(row.no_brand_visible),
    item_types: parseTextOrJsonArray(row.item_types),
    fabric_types: parseTextOrJsonArray(row.fabric_types),
    fabric_identification: parseTextOrJsonArray(row.fabric_identification),
    fabric_description: parseTextOrJsonArray(row.fabric_description),
  };
}

function normalizeBurnTest(row: any) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    performed: Boolean(row.performed),
    moment: parseTextOrJsonArray(row.moment),
    flames: parseTextOrJsonArray(row.flames),
    no_flame: parseTextOrJsonArray(row.no_flame),
    ashes: parseTextOrJsonArray(row.ashes),
  };
}

function splitTextValues(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseTextOrJsonArray(value: unknown) {
  const parsed = parseJsonArray(value);
  if (parsed.length > 0) {
    return parsed;
  }

  return splitTextValues(value);
}

async function saveSubmissionImages(db: D1Database, submissionId: string, photos: unknown[]) {
  for (const photo of photos) {
    const normalized = normalizePhoto(photo);
    if (!normalized?.url) {
      continue;
    }

    await executeD1(
      db,
      `INSERT INTO submission_images (id, submission_id, url, storage_key, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        generateD1UUID(),
        submissionId,
        normalized.url,
        normalized.key || null,
        JSON.stringify({
          label: normalized.label || null,
          original: photo,
        }),
      ]
    );
  }
}

function normalizePhoto(photo: unknown): { url: string; label?: string | null; key?: string | null } | null {
  if (typeof photo === 'string') {
    return { url: photo };
  }

  if (!photo || typeof photo !== 'object') {
    return null;
  }

  const value = photo as { url?: unknown; label?: unknown; key?: unknown };
  if (typeof value.url !== 'string') {
    return null;
  }

  return {
    url: value.url,
    label: typeof value.label === 'string' ? value.label : null,
    key: typeof value.key === 'string' ? value.key : null,
  };
}
