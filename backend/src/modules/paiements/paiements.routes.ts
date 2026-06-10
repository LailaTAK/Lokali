// backend/src/modules/paiements/paiements.routes.ts

import express, { Router } from 'express';
import {
  initierPaiementController,
  rembourserController,
  getPaiementByIdController,
  getPaiementsByUserController,
} from './paiements.controller';
import {
  handleStripeWebhook,
  handleWaveWebhook,
  handleOrangeMoneyWebhook,
} from './paiements.webhook';
import { initierPaiementSchema } from './paiements.schema';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';

const router = Router();

/**
 * Route: Initiate a payment request.
 * Method: POST
 * Access: Authenticated users only. Validates request body.
 */
router.post('/initier', authenticate, validate(initierPaiementSchema), initierPaiementController);

/**
 * Route: Retrieve transaction history records for the authenticated user.
 * Method: GET
 * Access: Authenticated users.
 */
router.get('/', authenticate, getPaiementsByUserController);

/**
 * Route: Trigger transaction refund.
 * Method: POST
 * Access: Authenticated ADMINISTRATEUR only.
 */
router.post('/:id/rembourser', authenticate, authorize('ADMINISTRATEUR'), rembourserController);

/**
 * Route: Retrieve detailed payment by ID.
 * Method: GET
 * Access: Authenticated participants (client, host) or admin.
 */
router.get('/:id', authenticate, getPaiementByIdController);

// --- WEBHOOK ENDPOINTS ---
// Note: Signature verification requires raw body parsing, which is configured below.

/**
 * Webhook Route: Stripe payment notifications.
 * Parses raw JSON body.
 */
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

/**
 * Webhook Route: Wave mobile money notifications.
 * Parses raw JSON body.
 */
router.post(
  '/webhook/wave',
  express.raw({ type: 'application/json' }),
  handleWaveWebhook
);

/**
 * Webhook Route: Orange Money mobile money notifications.
 * Standard JSON parsing.
 */
router.post(
  '/webhook/orange-money',
  express.json(),
  handleOrangeMoneyWebhook
);

export const paiementsRouter = router;
export default router;

// FICHIER SUIVANT : backend/src/test-paiements.ts (pour vérification)
