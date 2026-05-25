import type { HttpRequest as Request, HttpResponse as Response } from '../types/http.js';
import { getClient, query } from '../config/database.js';
import { AppError } from '../utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from '../services/notificationService.js';

const joinTextValues = (values?: string[] | null) =>
  Array.isArray(values) && values.length > 0 ? values.join(', ') : null;

const toJsonArrayValues = (values?: unknown[] | null) =>
  Array.isArray(values) ? values.map((value) => JSON.stringify(value)) : [];

const trackingStatusLabels: Record<string, string> = {
  request_sent: 'Request sent',
  scheduled: 'Scheduled',
  in_transit: 'Shipped / In transit',
  dropoff_completed: 'Drop-off completed',
  completed: 'Completed',
};

const trackingMethodLabels: Record<string, string> = {
  drop_off: 'Direct drop-off',
  shipping: 'Courier',
  pickup: 'Pickup',
  other: 'Other',
};

const buildTrackingMessage = (
  status: string,
  method?: string | null,
  contactName?: string | null,
  logisticsCompany?: string | null,
  trackingNumber?: string | null,
  dropoffScheduledAt?: string | Date | null,
  dropoffLocation?: string | null,
  notes?: string | null,
) => {
  const parts = [
    `The user updated delivery details for this request.`,
    `Method: ${trackingMethodLabels[method || 'drop_off'] || method || 'Direct drop-off'}.`,
    `Status: ${trackingStatusLabels[status] || status}.`,
  ];
  if (contactName) parts.push(`Contact name: ${contactName}.`);
  if (logisticsCompany) parts.push(`Courier: ${logisticsCompany}.`);
  if (trackingNumber) parts.push(`Tracking Number: ${trackingNumber}.`);
  if (dropoffScheduledAt) parts.push(`Drop-off date/time: ${dropoffScheduledAt}.`);
  if (dropoffLocation) parts.push(`Drop-off location: ${dropoffLocation}.`);
  if (notes) parts.push(`Notes: ${notes}`);
  return parts.join(' ');
};

export const createSubmission = async (req: Request, res: Response) => {
  const client = await getClient();
  let transactionStarted = false;

  try {
    const {
      item_type,
      submission_name,
      condition,
      fabric,
      cleanliness,
      description,
      photos,
      service_type,
      quantity,
      buyback_interest,
      action,
      upcycle_request,
      scheduled_at,
      details,
      burn_test,
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    await client.query('BEGIN');
    transactionStarted = true;

    const id = uuidv4();
    const photoValues = Array.isArray(photos) ? photos : [];
    const photoJsonValues = toJsonArrayValues(photoValues);
    const result = await client.query(
      `INSERT INTO submissions (
         id,
         user_id,
         item_type,
         condition,
         fabric,
         cleanliness,
         description,
         photos,
         status,
         submission_name,
         service_type,
         quantity,
         buyback_interest,
         action,
         upcycle_request,
         scheduled_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::json[], $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id,
        userId,
        item_type,
        condition,
        fabric,
        cleanliness,
        description,
        photoJsonValues,
        'pending',
        submission_name ?? null,
        service_type ?? null,
        quantity ?? null,
        buyback_interest ?? false,
        action ?? null,
        upcycle_request ?? null,
        scheduled_at ?? null,
      ]
    );

    if (details) {
      await client.query(
        `INSERT INTO submission_details (
           submission_id,
           item_types,
           other_item_type,
           condition,
           cleanliness,
           knows_fabric_type,
           fabric_types,
           custom_fabric_text,
           fabric_identification,
           brand,
           no_brand_visible,
           fabric_description,
           restricted_category,
           uniform_branding,
           fiber_composition,
           wearability,
           repairability,
           contamination_level,
           damage_classification,
           repurposing_potential,
           trim_removal,
           weight_value,
           weight_unit
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (submission_id)
          DO UPDATE SET
            item_types = EXCLUDED.item_types,
            other_item_type = EXCLUDED.other_item_type,
            condition = EXCLUDED.condition,
            cleanliness = EXCLUDED.cleanliness,
            knows_fabric_type = EXCLUDED.knows_fabric_type,
            fabric_types = EXCLUDED.fabric_types,
            custom_fabric_text = EXCLUDED.custom_fabric_text,
            fabric_identification = EXCLUDED.fabric_identification,
            brand = EXCLUDED.brand,
            no_brand_visible = EXCLUDED.no_brand_visible,
            fabric_description = EXCLUDED.fabric_description,
            restricted_category = EXCLUDED.restricted_category,
            uniform_branding = EXCLUDED.uniform_branding,
            fiber_composition = EXCLUDED.fiber_composition,
            wearability = EXCLUDED.wearability,
            repairability = EXCLUDED.repairability,
            contamination_level = EXCLUDED.contamination_level,
            damage_classification = EXCLUDED.damage_classification,
            repurposing_potential = EXCLUDED.repurposing_potential,
            trim_removal = EXCLUDED.trim_removal,
            weight_value = EXCLUDED.weight_value,
            weight_unit = EXCLUDED.weight_unit,
            updated_at = NOW()`,
        [
          id,
          joinTextValues(details.item_types),
          details.other_item_type ?? null,
          details.condition ?? condition,
          details.cleanliness ?? cleanliness,
          details.knows_fabric_type ?? null,
          joinTextValues(details.fabric_types),
          details.custom_fabric_text ?? null,
          joinTextValues(details.fabric_identification),
          details.brand ?? null,
          details.no_brand_visible ?? false,
          joinTextValues(details.fabric_description),
          details.restricted_category ?? 'none',
          details.uniform_branding ?? null,
          details.fiber_composition ?? null,
          details.wearability ?? null,
          details.repairability ?? null,
          details.contamination_level ?? null,
          details.damage_classification ?? null,
          details.repurposing_potential ?? null,
          details.trim_removal ?? null,
          details.weight_value ?? null,
          details.weight_unit ?? 'kg',
        ]
      );
    }

    if (burn_test) {
      await client.query(
        `INSERT INTO burn_tests (
           submission_id,
           performed,
           page,
           moment,
           flames,
           no_flame,
           smell,
           ashes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          burn_test.performed ?? false,
          burn_test.page ?? null,
          joinTextValues(burn_test.moment),
          joinTextValues(burn_test.flames),
          joinTextValues(burn_test.no_flame),
          burn_test.smell ?? null,
          joinTextValues(burn_test.ashes),
        ]
      );
    }

    if (photoValues.length > 0) {
      for (const photo of photoValues) {
        const normalizedPhoto = normalizePhoto(photo);
        if (!normalizedPhoto?.url) {
          continue;
        }

        await client.query(
          `INSERT INTO submission_images (submission_id, url, storage_key, metadata)
           VALUES ($1, $2, $3, $4)`,
          [
            id,
            normalizedPhoto.url,
            normalizedPhoto.key,
            JSON.stringify({
              label: normalizedPhoto.label,
              original: photo,
            }),
          ]
        );

        await client.query(
          `UPDATE uploaded_files
           SET related_entity_type = 'submission',
               related_entity_id = $1,
               purpose = 'submission_image',
               updated_at = NOW()
           WHERE url = $2`,
          [id, normalizedPhoto.url]
        );
      }
    }

    await client.query('COMMIT');
    transactionStarted = false;

    res.status(201).json({
      message: 'Submission created successfully',
      data: {
        ...result.rows[0],
        details: details ?? null,
        burn_test: burn_test ?? null,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    res.status(400).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
};

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

export const getUserSubmissions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const result = await query(
      `SELECT
         s.*,
         row_to_json(sd) AS details,
         row_to_json(bt) AS burn_test,
         COALESCE((
           SELECT json_agg(rtu ORDER BY rtu.created_at DESC)
           FROM request_tracking_updates rtu
           WHERE rtu.submission_id = s.id
         ), '[]'::json) AS tracking_updates,
         (
           SELECT row_to_json(rtu)
           FROM request_tracking_updates rtu
           WHERE rtu.submission_id = s.id
           ORDER BY rtu.created_at DESC
           LIMIT 1
         ) AS latest_tracking_update
       FROM submissions s
       LEFT JOIN submission_details sd ON sd.submission_id = s.id
       LEFT JOIN LATERAL (
         SELECT *
         FROM burn_tests
         WHERE submission_id = s.id
         ORDER BY created_at DESC
         LIMIT 1
       ) bt ON true
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
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
      `SELECT
         s.*,
         row_to_json(sd) AS details,
         row_to_json(bt) AS burn_test,
         COALESCE((
           SELECT json_agg(rtu ORDER BY rtu.created_at DESC)
           FROM request_tracking_updates rtu
           WHERE rtu.submission_id = s.id
         ), '[]'::json) AS tracking_updates,
         (
           SELECT row_to_json(rtu)
           FROM request_tracking_updates rtu
           WHERE rtu.submission_id = s.id
           ORDER BY rtu.created_at DESC
           LIMIT 1
         ) AS latest_tracking_update
       FROM submissions s
       LEFT JOIN submission_details sd ON sd.submission_id = s.id
       LEFT JOIN LATERAL (
         SELECT *
         FROM burn_tests
         WHERE submission_id = s.id
         ORDER BY created_at DESC
         LIMIT 1
       ) bt ON true
       WHERE s.id = $1`,
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

export const getSubmissionTrackingUpdates = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user?.id) {
      throw new AppError(401, 'User not authenticated');
    }

    const access = await query(
      `SELECT s.id
       FROM submissions s
       LEFT JOIN transactions t ON t.submission_id = s.id
       LEFT JOIN partners p ON p.id = t.to_partner_id
       WHERE s.id = $1
         AND (
           s.user_id = $2
           OR $3 = 'admin'
           OR p.user_id = $2
           OR lower(p.email) = lower($4)
         )
       LIMIT 1`,
      [id, user.id, user.role, user.email || '']
    );

    if (access.rows.length === 0) {
      throw new AppError(403, 'You do not have access to this tracking history');
    }

    const updates = await query(
      `SELECT rtu.*, u.name AS user_name, p.name AS partner_name
       FROM request_tracking_updates rtu
       LEFT JOIN users u ON u.id = rtu.user_id
       LEFT JOIN partners p ON p.id = rtu.partner_id
       WHERE rtu.submission_id = $1
       ORDER BY rtu.created_at DESC`,
      [id]
    );

    res.json({ data: updates.rows, count: updates.rows.length });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};

export const createSubmissionTrackingUpdate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const {
      request_id,
      progress_status,
      fulfillment_method = 'drop_off',
      contact_name,
      logistics_company,
      tracking_number,
      dropoff_scheduled_at,
      dropoff_location,
      notes,
    } = req.body;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const submission = await query('SELECT * FROM submissions WHERE id = $1 AND user_id = $2', [id, userId]);
    if (submission.rows.length === 0) {
      throw new AppError(404, 'Submission not found');
    }

    const requestResult = await query(
      `SELECT t.*, p.name AS partner_name, p.address AS partner_address, u.id AS partner_message_user_id
       FROM transactions t
       LEFT JOIN partners p ON p.id = t.to_partner_id
       LEFT JOIN users u ON u.id = p.user_id OR lower(u.email) = lower(p.email)
       WHERE t.submission_id = $1
         AND t.from_user_id = $2
         AND ($3::uuid IS NULL OR t.id = $3::uuid)
       ORDER BY COALESCE(t.updated_at, t.created_at) DESC
       LIMIT 1`,
      [id, userId, request_id || null]
    );
    const requestRow = requestResult.rows[0] || null;
    if (!requestRow) {
      throw new AppError(404, 'Accepted partner request not found');
    }
    if (requestRow.status !== 'accepted') {
      throw new AppError(400, 'Delivery details can only be updated after the partner accepts the request.');
    }
    const updateId = uuidv4();
    const isShipping = fulfillment_method === 'shipping';
    const finalDropoffLocation = isShipping
      ? null
      : dropoff_location || requestRow.partner_address || null;

    if (!contact_name) {
      throw new AppError(400, 'Contact name is required for delivery updates.');
    }
    if (!notes) {
      throw new AppError(400, 'Notes are required for delivery updates.');
    }
    if (isShipping && (!logistics_company || !tracking_number)) {
      throw new AppError(400, 'Courier and tracking number are required for courier delivery updates.');
    }
    if (!isShipping && (!dropoff_scheduled_at || !finalDropoffLocation)) {
      throw new AppError(400, 'Drop-off date/time and location are required for direct drop-off updates.');
    }

    const result = await query(
      `INSERT INTO request_tracking_updates (
         id, submission_id, request_id, user_id, partner_id, progress_status,
         fulfillment_method, contact_name, logistics_company, tracking_number,
         dropoff_scheduled_at, dropoff_location, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        updateId,
        id,
        requestRow?.id || request_id || null,
        userId,
        requestRow?.to_partner_id || null,
        progress_status,
        fulfillment_method,
        contact_name || null,
        isShipping ? logistics_company || null : null,
        isShipping ? tracking_number || null : null,
        !isShipping && dropoff_scheduled_at ? dropoff_scheduled_at : null,
        finalDropoffLocation,
        notes || null,
      ]
    );

    const messageContent = buildTrackingMessage(
      progress_status,
      fulfillment_method,
      contact_name,
      isShipping ? logistics_company : null,
      isShipping ? tracking_number : null,
      !isShipping ? dropoff_scheduled_at : null,
      finalDropoffLocation,
      notes,
    );
    if (requestRow?.partner_message_user_id && requestRow.partner_message_user_id !== userId) {
      await query(
        `INSERT INTO messages (
           id, from_user_id, to_user_id, content,
           related_submission_id, related_transaction_id, action_url, metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          userId,
          requestRow.partner_message_user_id,
          messageContent,
          id,
          requestRow.id,
          `/partner?request=${requestRow.id}`,
          JSON.stringify({
            kind: 'tracking_update',
            submission_id: id,
            transaction_id: requestRow.id,
            tracking_update_id: updateId,
            fulfillment_method,
          }),
        ]
      );

      await createNotification({
        userId: requestRow.partner_message_user_id,
        type: 'partner_update',
        title: 'Delivery details updated',
        body: `${submission.rows[0].submission_name || submission.rows[0].item_type}: ${trackingMethodLabels[fulfillment_method] || fulfillment_method} - ${trackingStatusLabels[progress_status] || progress_status}`,
        data: {
          submissionId: id,
          requestId: requestRow.id,
          transactionId: requestRow.id,
          trackingUpdateId: updateId,
          progressStatus: progress_status,
          action_url: `/partner?request=${requestRow.id}`,
        },
      });
    }

    await createNotification({
      userId,
      type: 'system',
      title: 'Tracking update recorded',
      body: `${submission.rows[0].submission_name || submission.rows[0].item_type}: ${trackingStatusLabels[progress_status] || progress_status}`,
      data: { submissionId: id, trackingUpdateId: updateId, progressStatus: progress_status },
    });

    res.status(201).json({
      message: 'Tracking update recorded successfully',
      data: {
        ...result.rows[0],
        status_label: trackingStatusLabels[progress_status] || progress_status,
        fulfillment_method_label: trackingMethodLabels[fulfillment_method] || fulfillment_method,
      },
    });
  } catch (error) {
    res.status((error as AppError).statusCode || 400).json({ error: (error as Error).message });
  }
};
