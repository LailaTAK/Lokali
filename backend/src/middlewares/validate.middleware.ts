// backend/src/middlewares/validate.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

/**
 * Interface representing a standard formatted validation error item.
 */
export interface FormattedValidationError {
  field: string;
  message: string;
}

/**
 * Formats a raw ZodError into an array of readable field-to-message mappings.
 * 
 * @param {ZodError} error - The validation error object thrown by Zod.
 * @returns {FormattedValidationError[]} List of formatted error details.
 */
export function formatZodError(error: ZodError): FormattedValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Express Middleware factory to validate req.body against a Zod schema.
 * Returns 422 Unprocessable Entity with formatted errors if validation fails.
 * 
 * @param {ZodTypeAny} schema - The Zod schema to validate req.body against.
 * @returns {Function} Express middleware.
 */
export function validate(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // safeParse or parseAsync will filter or parse the body
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({
          message: 'Validation failed for request body.',
          errors: formatZodError(error),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Express Middleware factory to validate req.query parameters against a Zod schema.
 * Returns 422 Unprocessable Entity with formatted errors if validation fails.
 * 
 * @param {ZodTypeAny} schema - The Zod schema to validate req.query against.
 * @returns {Function} Express middleware.
 */
export function validateQuery(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({
          message: 'Validation failed for query parameters.',
          errors: formatZodError(error),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Express Middleware factory to validate req.params path parameters against a Zod schema.
 * Returns 422 Unprocessable Entity with formatted errors if validation fails.
 * 
 * @param {ZodTypeAny} schema - The Zod schema to validate req.params against.
 * @returns {Function} Express middleware.
 */
export function validateParams(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({
          message: 'Validation failed for URL route parameters.',
          errors: formatZodError(error),
        });
        return;
      }
      next(error);
    }
  };
}

// FICHIER SUIVANT : backend/src/middlewares/rateLimiter.middleware.ts
