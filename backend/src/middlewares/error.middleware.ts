// backend/src/middlewares/error.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Custom application error class to handle operational (expected) exceptions
 * with custom HTTP status codes and messages.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  /**
   * AppError constructor.
   * 
   * @param {string} message - Descriptive error message.
   * @param {number} [statusCode=400] - Corresponding HTTP status code.
   * @param {boolean} [isOperational=true] - Marks error as expected/handled.
   */
  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Set prototype explicitly to retain class methods in TS
    Object.setPrototypeOf(this, new.target.prototype);
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express Middleware: Catch-all 404 Not Found helper.
 * Triggers when no registered routes match the requested URL.
 */
export function notFound(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404);
  next(error);
}

/**
 * Express Middleware: Global error handler.
 * Catch, categorise, log, and respond to all exceptions thrown in the application.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error occurred.';
  let errors: any = undefined;

  // 1. Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation failed.';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // 2. Handle Prisma Client Known Request Errors
  else if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation (e.g. Email already exists)
        statusCode = 409;
        message = 'Conflict. A record with this value already exists.';
        // Extract fields causing constraint violation if possible
        if (err.meta && err.meta.target) {
          errors = [{ field: (err.meta.target as string[]).join(','), message: 'Must be unique.' }];
        }
        break;
      case 'P2025': // Record to update/delete not found
        statusCode = 404;
        message = 'The requested database record was not found.';
        break;
      case 'P2003': // Foreign key constraint failed
        statusCode = 400;
        message = 'Database constraint error: invalid reference key provided.';
        break;
      default:
        statusCode = 500;
        message = 'A database operation failed.';
        break;
    }
  }

  // 3. Handle JSON Web Token Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication failed: invalid token structure.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication failed: token has expired.';
  }

  // Log error using Winston (always format message and stack trace)
  logger.error(`${statusCode} - ${message} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`, {
    stack: err.stack,
    details: errors || err,
  });

  // Capture unexpected 500 errors to Sentry in production
  if (env.NODE_ENV === 'production' && statusCode === 500) {
    try {
      Sentry.captureException(err);
    } catch (sentryErr) {
      logger.error('Failed to report exception to Sentry:', sentryErr);
    }
  }

  // Prepare standard response payload
  const isProd = env.NODE_ENV === 'production';
  const responsePayload: { message: string; errors?: any; stack?: string } = {
    message: isProd && statusCode === 500 ? 'An unexpected system error occurred.' : message,
  };

  if (errors) {
    responsePayload.errors = errors;
  }

  // Expose error stack trace in development mode only
  if (!isProd && statusCode === 500) {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
}

// FICHIER SUIVANT : backend/src/test-middlewares.ts (pour vérification)
