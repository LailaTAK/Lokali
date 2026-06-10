// backend/src/modules/paiements/paiements.controller.ts

import { Request, Response, NextFunction } from 'express';
import {
  initierPaiement,
  rembourser,
  getPaiementById,
  getPaiementsByUser,
} from './paiements.service';
import { AppError } from '../../middlewares/error.middleware';

/**
 * Express Controller: Initiate a booking payment.
 * Returns checkout settings for CARTE (Stripe), WAVE, or ORANGE_MONEY.
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request with reservationId and methode.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function initierPaiementController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await initierPaiement(userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Refund a settled payment transaction.
 * Restricted to ADMINISTRATEUR users.
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request with payment ID in req.params.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function rembourserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (req.user!.role !== 'ADMINISTRATEUR') {
      throw new AppError("Seuls les administrateurs peuvent initier des remboursements.", 403);
    }

    const result = await rembourser(id, adminId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Retrieve detailed transaction.
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request with payment ID in req.params.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function getPaiementByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const result = await getPaiementById(id, userId, role);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Retrieve payment history records for the authenticated user.
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function getPaiementsByUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const result = await getPaiementsByUser(userId, role);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// FICHIER SUIVANT : backend/src/modules/paiements/paiements.routes.ts
