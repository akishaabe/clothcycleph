import { Request, Response } from 'express';
import { getClient, query } from '../config/database.js';
import { AppError } from '../utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const joinTextValues = (values?: string[] | null) =>
  Array.isArray(values) && values.length > 0 ? values.join(', ') : null;

const toJsonArrayValues = (values?: unknown[] | null) =>
  Array.isArray(values) ? values.map((value) => JSON.stringify(value)) : [];

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
        quantity ?? 1,
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
           trim_removal
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
        if (typeof photo !== 'string') {
          continue;
        }

        await client.query(
          `INSERT INTO submission_images (submission_id, url)
           VALUES ($1, $2)`,
          [id, photo]
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
