import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../helpers/utils/errors';
import { HTTP_STATUS } from '../helpers/constants/http';
import { isProd } from '../config/env';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT',
          message: 'Unique constraint violation',
          details: err.meta,
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found' },
      });
      return;
    }
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  if (!isProd) {
    console.error('[error]', err);
  }
  res.status(HTTP_STATUS.INTERNAL).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: isProd ? 'Internal server error' : message },
  });
};
