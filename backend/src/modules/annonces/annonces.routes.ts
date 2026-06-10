// backend/src/modules/annonces/annonces.routes.ts

import { Router } from 'express';
import {
  getAnnoncesController,
  createAnnonceController,
  getAnnonceByIdController,
  updateAnnonceController,
  deleteAnnonceController,
  modererAnnonceController,
} from './annonces.controller';
import {
  createAnnonceSchema,
  updateAnnonceSchema,
  searchAnnonceSchema,
  modererAnnonceSchema,
} from './annonces.schema';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate, validateQuery } from '../../middlewares/validate.middleware';

const router = Router();

/**
 * Route: Search property announcements.
 * Method: GET
 * Access: Public. Validates query parameters.
 */
router.get('/', validateQuery(searchAnnonceSchema), getAnnoncesController);

/**
 * Route: Create a new announcement.
 * Method: POST
 * Access: Authenticated LOUEUR only. Validates request body.
 */
router.post(
  '/',
  authenticate,
  authorize('LOUEUR'),
  validate(createAnnonceSchema),
  createAnnonceController
);

/**
 * Route: Retrieve detailed announcement information.
 * Method: GET
 * Access: Public.
 */
router.get('/:id', getAnnonceByIdController);

/**
 * Route: Modify announcement settings.
 * Method: PUT
 * Access: Authenticated LOUEUR owner only. Validates partial parameters.
 */
router.put(
  '/:id',
  authenticate,
  authorize('LOUEUR'),
  validate(updateAnnonceSchema),
  updateAnnonceController
);

/**
 * Route: Archive an announcement (soft-delete).
 * Method: DELETE
 * Access: Authenticated LOUEUR owner only.
 */
router.delete('/:id', authenticate, authorize('LOUEUR'), deleteAnnonceController);

/**
 * Route: Moderate an announcement (Approve or Reject).
 * Method: PATCH
 * Access: Authenticated ADMINISTRATEUR only. Validates status constraints.
 */
router.patch(
  '/:id/moderer',
  authenticate,
  authorize('ADMINISTRATEUR'),
  validate(modererAnnonceSchema),
  modererAnnonceController
);

export const annoncesRouter = router;
export default router;

// FICHIER SUIVANT : backend/src/test-annonces.ts (pour vérification)
