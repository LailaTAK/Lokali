// backend/src/modules/auth/auth.routes.ts

import { Router } from 'express';
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
} from './auth.controller';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * Route: User Registration.
 * Validated against registration input expectations.
 */
router.post('/register', validate(registerSchema), registerController);

/**
 * Route: User Authentication / Login.
 * Validated against login credentials expectations.
 */
router.post('/login', validate(loginSchema), loginController);

/**
 * Route: JWT Access Token rotation.
 * Validates existence and structure of the refresh token.
 */
router.post('/refresh', validate(refreshSchema), refreshController);

/**
 * Route: User Session Logout.
 * Requires user authentication via Bearer token to proceed.
 */
router.post('/logout', authenticate, logoutController);

export const authRouter = router;
export default router;

// FICHIER SUIVANT : backend/src/test-auth.ts (pour vérification)
