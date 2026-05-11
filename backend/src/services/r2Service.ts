import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/env.js';

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: config.r2.accessKeyId || '',
    secretAccessKey: config.r2.secretAccessKey || '',
  },
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
});

export async function uploadToR2(
  file: Buffer,
  fileName: string,
  mimetype: string
): Promise<{ url: string; key: string }> {
  try {
    const key = `submissions/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: config.r2.bucketName || 'clothcycle',
      Key: key,
      Body: file,
      ContentType: mimetype,
    });

    await s3Client.send(command);

    // Construct the public URL
    const url = `https://clothcycle.${config.r2.accountId}.r2.cloudflarestorage.com/${key}`;

    return { url, key };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error('Failed to upload file to R2');
  }
}

export function getS3Client() {
  return s3Client;
}
