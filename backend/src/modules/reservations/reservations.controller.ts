// backend/src/modules/reservations/reservations.controller.ts

import { Request, Response, NextFunction } from 'express';
import {
  createReservation,
  getReservations,
  getReservationById,
  updateStatut,
  getCalendrierLoueur,
} from './reservations.service';
import { AppError } from '../../middlewares/error.middleware';

/**
 * Express Controller: Request a new booking reservation.
 * Restricted to CLIENT role.
 * Responds with HTTP status 201 Created on success.
 * 
 * @param {Request} req - Express request with check-in/out dates and listing ID in body.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function createReservationController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientId = req.user!.id;
    
    // Clients shouldn't be allowed to request reservations if their role is not CLIENT
    if (req.user!.role !== 'CLIENT') {
      throw new AppError('Seuls les clients peuvent soumettre des demandes de réservation.', 403);
    }

    const result = await createReservation(clientId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Retrieve filtered, role-bound bookings list.
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function getReservationsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const result = await getReservations(userId, role, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Retrieve a specific booking details.
 * Validates requester role and ownership.
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function getReservationByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    const result = await getReservationById(id, userId, role);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Modify a reservation status (Confirm or Cancel).
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request containing target status in body.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function updateStatutController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    const { statut } = req.body;

    if (!statut) {
      throw new AppError('Le paramètre statut est obligatoire.', 400);
    }

    const result = await updateStatut(id, userId, role, statut);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Retrieve confirmed bookings for calendar display.
 * Restricted to LOUEUR hosts.
 * Responds with HTTP status 200 OK.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function getCalendrierLoueurController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const loueurId = req.user!.id;

    if (req.user!.role !== 'LOUEUR' && req.user!.role !== 'ADMINISTRATEUR') {
      throw new AppError('Seuls les loueurs peuvent consulter leur calendrier.', 403);
    }

    const result = await getCalendrierLoueur(loueurId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// FICHIER SUIVANT : backend/src/modules/reservations/reservations.routes.ts
