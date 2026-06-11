// backend/src/modules/biens/biens.controller.ts

import { Request, Response, NextFunction } from 'express';
import {
  createBien,
  getBiens,
  getBienById,
  updateBien,
  deleteBien,
  uploadPhotosService,
  changerStatut,
} from './biens.service';
import { AppError } from '../../middlewares/error.middleware';

/**
 * Express Controller: Retrieve filtered and paginated list of properties.
 * Public access.
 * 
 * @param {Request} req - Express request with search parameters in req.query.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function getBiensController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getBiens(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Register a new property listing.
 * Restricted to LOUEUR hosts.
 * 
 * @param {Request} req - Express request with validated inputs in req.body.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function createBienController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const loueurId = req.user!.id;
    const result = await createBien(loueurId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Retrieve a specific property with announcements and reviews metrics.
 * Public access.
 * 
 * @param {Request} req - Express request with id in req.params.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function getBienByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await getBienById(id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Update property details.
 * Restricted to the LOUEUR owner.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function updateBienController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const loueurId = req.user!.id;
    const result = await updateBien(id, loueurId, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Delete a property listing (soft delete).
 * Restricted to the LOUEUR owner.
 * 
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function deleteBienController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const loueurId = req.user!.id;
    await deleteBien(id, loueurId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Upload and attach multiple photos to a property.
 * Restricted to the LOUEUR owner.
 * 
 * @param {Request} req - Express request containing files in req.files.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function uploadPhotosController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const loueurId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('Veuillez fournir au moins un fichier image.', 400);
    }

    const result = await uploadPhotosService(id, loueurId, files);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: Modify a property's availability status.
 * Restricted to the LOUEUR owner.
 * 
 * @param {Request} req - Express request containing new statut in req.body.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Error middleware.
 * @returns {Promise<void>}
 */
export async function changerStatutController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const loueurId = req.user!.id;
    const { statut } = req.body;

    if (!statut) {
      throw new AppError('Le paramètre statut est obligatoire.', 400);
    }

    const result = await changerStatut(id, loueurId, statut);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// FICHIER SUIVANT : backend/src/modules/biens/biens.routes.ts
