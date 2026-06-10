// backend/src/modules/users/users.controller.ts

import { Request, Response, NextFunction } from 'express';
import {
  getUserById,
  updateUser,
  uploadAvatar,
  changePassword,
  getUserStats,
} from './users.service';
import { AppError } from '../../middlewares/error.middleware';

/**
 * Express Controller: Retrieve user profile.
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Middleware error delegate.
 * @returns {Promise<void>}
 */
export async function getUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Update user profile.
 * Enforces ownership: users can only update their own profile, unless they are an ADMIN.
 * Responds with HTTP status 200 OK on success.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Middleware error delegate.
 * @returns {Promise<void>}
 */
export async function updateUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    // Enforce authorization logic
    if (currentUserId !== id && currentUserRole !== 'ADMINISTRATEUR') {
      throw new AppError("Vous n'êtes pas autorisé à modifier ce profil.", 403);
    }

    const updatedUser = await updateUser(id, req.body);
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Upload avatar image to S3 and save photo URL.
 * Responds with HTTP status 200 OK on success.
 * 
 * @param {Request} req - Express request with Multer-processed req.file.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Middleware error delegate.
 * @returns {Promise<void>}
 */
export async function uploadAvatarController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    // Enforce authorization logic
    if (currentUserId !== id && currentUserRole !== 'ADMINISTRATEUR') {
      throw new AppError("Vous n'êtes pas autorisé à modifier cette photo de profil.", 403);
    }

    if (!req.file) {
      throw new AppError('Veuillez fournir un fichier image valide.', 400);
    }

    const result = await uploadAvatar(id, req.file);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Change user password.
 * Enforces ownership: users can only update their own password.
 * Responds with HTTP status 200 OK with success message.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Middleware error delegate.
 * @returns {Promise<void>}
 */
export async function changePasswordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    // Only the profile owner can change their password
    if (currentUserId !== id) {
      throw new AppError("Vous n'êtes pas autorisé à modifier ce mot de passe.", 403);
    }

    const { ancienMotDePasse, nouveauMotDePasse } = req.body;
    await changePassword(id, ancienMotDePasse, nouveauMotDePasse);

    res.status(200).json({ message: 'Le mot de passe a été mis à jour avec succès.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Retrieve user-specific metrics.
 * Responds with HTTP status 200 OK on success.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Middleware error delegate.
 * @returns {Promise<void>}
 */
export async function getUserStatsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    // Enforce authorization logic
    if (currentUserId !== id && currentUserRole !== 'ADMINISTRATEUR') {
      throw new AppError("Vous n'êtes pas autorisé à consulter ces statistiques.", 403);
    }

    const stats = await getUserStats(id);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
}

// FICHIER SUIVANT : backend/src/modules/users/users.routes.ts
