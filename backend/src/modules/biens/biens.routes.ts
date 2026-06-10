// backend/src/modules/biens/biens.routes.ts

import { Router } from 'express';
import {
  getBiensController,
  createBienController,
  getBienByIdController,
  updateBienController,
  deleteBienController,
  uploadPhotosController,
  changerStatutController,
} from './biens.controller';
import {
  createBienSchema,
  updateBienSchema,
  filterBiensSchema,
} from './biens.schema';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate, validateQuery } from '../../middlewares/validate.middleware';
import { uploadLimiter } from '../../middlewares/rateLimiter.middleware';
import { uploadPhotos } from './biens.upload';

const router = Router();

/**
 * Route: Search properties.
 * Method: GET
 * Access: Public. Validates query parameters.
 */
router.get('/', validateQuery(filterBiensSchema), getBiensController);

/**
 * Route: Register a new property.
 * Method: POST
 * Access: Authenticated LOUEUR only. Validates request body.
 */
router.post(
  '/',
  authenticate,
  authorize('LOUEUR'),
  validate(createBienSchema),
  createBienController
);

/**
 * Route: Retrieve specific property details.
 * Method: GET
 * Access: Public.
 */
router.get('/:id', getBienByIdController);

/**
 * Route: Modify an existing property listing.
 * Method: PUT
 * Access: Authenticated LOUEUR only. Validates partial updates in request body.
 */
router.put(
  '/:id',
  authenticate,
  authorize('LOUEUR'),
  validate(updateBienSchema),
  updateBienController
);

/**
 * Route: Delete a property listing (soft-delete).
 * Method: DELETE
 * Access: Authenticated LOUEUR only.
 */
router.delete('/:id', authenticate, authorize('LOUEUR'), deleteBienController);

/**
 * Route: Upload and attach up to 10 photos to a property.
 * Method: POST
 * Access: Authenticated LOUEUR only. Rate limited on uploads.
 */
router.post(
  '/:id/photos',
  authenticate,
  authorize('LOUEUR'),
  uploadLimiter,
  uploadPhotos,
  uploadPhotosController
);

/**
 * Route: Change property availability status.
 * Method: PATCH
 * Access: Authenticated LOUEUR only.
 */
router.patch(
  '/:id/statut',
  authenticate,
  authorize('LOUEUR'),
  changerStatutController
);

export const biensRouter = router;
export default router;

// FICHIER SUIVANT : backend/src/test-biens.ts (pour vérification)
