// backend/src/modules/users/users.routes.ts

import { Router } from 'express';
import multer from 'multer';
import {
  getUserController,
  updateUserController,
  uploadAvatarController,
  changePasswordController,
  getUserStatsController,
} from './users.controller';
import { updateUserSchema, changePasswordSchema } from './users.schema';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { uploadLimiter } from '../../middlewares/rateLimiter.middleware';
import { AppError } from '../../middlewares/error.middleware';

const router = Router();

// Configure Multer for processing file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Format de fichier invalide. Seuls JPEG, PNG, GIF et WEBP sont acceptés.', 400));
    }
  },
});

/**
 * Route: Retrieve user profile by ID.
 * Method: GET
 */
router.get('/:id', authenticate, getUserController);

/**
 * Route: Update user profile.
 * Method: PUT
 */
router.put('/:id', authenticate, validate(updateUserSchema), updateUserController);

/**
 * Route: Upload user avatar to S3.
 * Method: POST
 * Limits: Enforced by uploadLimiter (20 uploads per hour per user).
 */
router.post(
  '/:id/avatar',
  authenticate,
  uploadLimiter,
  upload.single('avatar'),
  uploadAvatarController
);

/**
 * Route: Change password.
 * Method: POST
 */
router.post('/:id/password', authenticate, validate(changePasswordSchema), changePasswordController);

/**
 * Route: Get role-dependent user stats dashboard.
 * Method: GET
 */
router.get('/:id/stats', authenticate, getUserStatsController);

export const usersRouter = router;
export default router;

// FICHIER SUIVANT : backend/src/test-users.ts (pour vérification)
