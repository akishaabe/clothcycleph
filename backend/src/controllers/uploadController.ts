import { Request, Response } from 'express';
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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      throw new AppError(400, 'Only image files are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      throw new AppError(400, 'File size must be less than 5MB');
    }

    // Upload to R2
    const { url, key } = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

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
