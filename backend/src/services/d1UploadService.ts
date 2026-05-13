import { generateD1UUID } from '../config/d1.js';

export async function uploadFileToR2(
  bucket: any,
  fileBody: ArrayBuffer,
  originalName: string,
  contentType: string
) {
  const key = `${generateD1UUID()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const result = await bucket.put(key, fileBody, {
    httpMetadata: {
      contentType,
    },
  });

  const url = `https://${bucket.name}.r2.cloudflarestorage.com/${key}`;
  return {
    url,
    key,
    etag: result.etag,
  };
}
