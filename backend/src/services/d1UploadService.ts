import { D1Database, executeD1, generateD1UUID } from '../config/d1.js';

export async function uploadFileToR2(
  bucket: any,
  fileBody: ArrayBuffer,
  originalName: string,
  contentType: string,
  publicBaseUrl?: string
) {
  const key = `${generateD1UUID()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const result = await bucket.put(key, fileBody, {
    httpMetadata: {
      contentType,
    },
  });

  const baseUrl = publicBaseUrl?.replace(/\/$/, '');
  const url = baseUrl ? `${baseUrl}/api/uploads/${key}` : key;
  return {
    url,
    key,
    etag: result.etag,
  };
}

export async function recordUploadedFileD1(
  db: D1Database,
  payload: {
    userId: string;
    storageKey: string;
    url: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    purpose?: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await executeD1(
    db,
    `INSERT INTO uploaded_files (
       id, user_id, storage_key, url, original_name, content_type, size_bytes,
       purpose, related_entity_type, related_entity_id, metadata
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateD1UUID(),
      payload.userId,
      payload.storageKey,
      payload.url,
      payload.originalName,
      payload.contentType,
      payload.sizeBytes,
      payload.purpose || 'general',
      payload.relatedEntityType || null,
      payload.relatedEntityId || null,
      JSON.stringify(payload.metadata || {}),
    ]
  );
}
