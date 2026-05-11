import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';

type RequestPart = 'body' | 'params' | 'query';

export const validate =
  (schema: ZodSchema, part: RequestPart = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req[part] = schema.parse(req[part]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      next(error);
    }
  };
