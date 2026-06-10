// backend/src/modules/reservations/reservations.routes.ts

import { Router } from 'express';
import {
  createReservationController,
  getReservationsController,
  getReservationByIdController,
  updateStatutController,
  getCalendrierLoueurController,
} from './reservations.controller';
import { createReservationSchema, updateStatutSchema } from './reservations.schema';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';

const router = Router();

/**
 * Route: Request a new reservation.
 * Method: POST
 * Access: Authenticated guests (CLIENT) only. Validates request body.
 */
router.post('/', authenticate, validate(createReservationSchema), createReservationController);

/**
 * Route: List reservations (filtered based on guest/host context).
 * Method: GET
 * Access: Authenticated users.
 */
router.get('/', authenticate, getReservationsController);

/**
 * Route: Retrieve host-specific bookings calendrier.
 * Method: GET
 * Access: Authenticated hosts (LOUEUR) only.
 * Note: Declared BEFORE /:id route to prevent pattern collision.
 */
router.get('/calendrier', authenticate, getCalendrierLoueurController);

/**
 * Route: Retrieve specific reservation details.
 * Method: GET
 * Access: Authenticated participants (client, host) or admin.
 */
router.get('/:id', authenticate, getReservationByIdController);

/**
 * Route: Accept or Cancel a reservation request.
 * Method: PATCH
 * Access: Authenticated hosts (LOUEUR), client, or admin.
 */
router.patch(
  '/:id/statut',
  authenticate,
  validate(updateStatutSchema),
  updateStatutController
);

export const reservationsRouter = router;
export default router;

// FICHIER SUIVANT : backend/src/test-reservations.ts (pour vérification)
