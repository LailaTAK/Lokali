// backend/src/modules/annonces/annonces.controller.ts

import { Request, Response, NextFunction } from 'express';
import {
  createAnnonce,
  getAnnonces,
  getAnnonceById,
  updateAnnonce,
  deleteAnnonce,
  modererAnnonce,
} from './annonces.service';

/**
 * Express Controller: Retrieve filtered announcements list.
 * Public access.
 * 
 * @param {Request} req - Express request with search parameters in req.query.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function getAnnoncesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getAnnonces(req.query as any);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Publish a new property announcement.
 * Restricted to LOUEUR hosts.
 * 
 * @param {Request} req - Express request containing title, description, price, and property ID.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function createAnnonceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const loueurId = req.user!.id;
    const result = await createAnnonce(loueurId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Retrieve detailed announcement by ID.
 * Public access. Increments page views in Redis.
 * 
 * @param {Request} req - Express request with id in req.params.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function getAnnonceByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await getAnnonceById(id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Modify properties of an existing announcement.
 * Restricted to the LOUEUR owner.
 * 
 * @param {Request} req - Express request with values in req.body.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function updateAnnonceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const loueurId = req.user!.id;
    const result = await updateAnnonce(id, loueurId, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Archive an announcement (soft-delete).
 * Restricted to the LOUEUR owner.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function deleteAnnonceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const loueurId = req.user!.id;
    await deleteAnnonce(id, loueurId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Moderate a pending announcement.
 * Restricted to ADMINISTRATEUR users only.
 * 
 * @param {Request} req - Express request with status and optional rejection reason in req.body.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware pipeline.
 * @returns {Promise<void>}
 */
export async function modererAnnonceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await modererAnnonce(id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// FICHIER SUIVANT : backend/src/modules/annonces/annonces.routes.ts
