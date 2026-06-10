// backend/src/test-middlewares.ts

import { authenticate, optionalAuth } from './middlewares/auth.middleware';
import { authorize } from './middlewares/role.middleware';
import { validate, validateQuery, validateParams } from './middlewares/validate.middleware';
import { apiLimiter, authLimiter, uploadLimiter } from './middlewares/rateLimiter.middleware';
import { AppError, notFound, errorHandler } from './middlewares/error.middleware';

console.log('Testing middleware files compile and load...');
console.log({
  authenticateExists: typeof authenticate !== 'undefined',
  authorizeExists: typeof authorize !== 'undefined',
  validateExists: typeof validate !== 'undefined',
  apiLimiterExists: typeof apiLimiter !== 'undefined',
  appErrorExists: typeof AppError !== 'undefined',
});
