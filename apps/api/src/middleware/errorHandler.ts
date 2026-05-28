/**
 * Social Planner - Error Handler Middleware
 *
 * Centralized error handling for the API.
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@social-planner/database';
import { logger } from '../lib/logger';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    },
    'Request error'
  );

  // Handle known error types
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        });
      case 'P2025':
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        });
      default:
        break;
    }
  }

  // Default error response
  const statusCode = 500;
  const response: Record<string, unknown> = {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  // Include stack trace in development
  if (config.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
