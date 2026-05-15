import { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/env.js';
import { AppError } from '../utils/errorHandler.js';
import { uploadToR2 } from '../services/r2Service.js';

export interface FileRequest extends Request {
  file?: Express.Multer.File;
  user?: {
    id: string;
    email: string;
    role: 'user' | 'partner' | 'admin';
  };
}

export const uploadFile = async (req: FileRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    if (!req.file) {
      throw new AppError(400, 'No file provided');
    }

    // Validate file type (images only)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      throw new AppError(400, 'Only image files are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      throw new AppError(400, 'File size must be less than 5MB');
    }

    let url: string;
    let key: string;

    try {
      if (
        config.server.env === 'development' &&
        (!config.r2.accountId || !config.r2.accessKeyId || !config.r2.secretAccessKey)
      ) {
        throw new Error('R2 is not configured for local development');
      }

      const uploaded = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      url = uploaded.url;
      key = uploaded.key;
    } catch (uploadError) {
      if (config.server.env !== 'development') {
        throw uploadError;
      }

      const extension = path.extname(req.file.originalname) || mimeToExtension(req.file.mimetype);
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, safeName), req.file.buffer);
      key = `local/${safeName}`;
      url = `${req.protocol}://${req.get('host')}/uploads/${safeName}`;
    }

    res.status(201).json({
      message: 'File uploaded successfully',
      url,
      key,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(400).json({ error: (error as Error).message });
  }
};

function mimeToExtension(mimetype: string) {
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/gif') return '.gif';
  if (mimetype === 'image/heic') return '.heic';
  if (mimetype === 'image/heif') return '.heif';
  return '.jpg';
}
