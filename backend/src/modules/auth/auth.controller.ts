// backend/src/modules/auth/auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { register, login, refreshTokens, logout } from './auth.service';

/**
 * Express Controller: User Registration.
 * Responds with HTTP status 201 Created on success.
 * 
 * @param {Request} req - Express request object containing validation-guaranteed registration inputs.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware pipeline helper.
 * @returns {Promise<void>}
 */
export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: User Login.
 * Responds with HTTP status 200 OK on success.
 * 
 * @param {Request} req - Express request object containing email and password.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware pipeline helper.
 * @returns {Promise<void>}
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, motDePasse } = req.body;
    const result = await login(email, motDePasse);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: JWT Refresh Token rotation.
 * Responds with HTTP status 200 OK on success.
 * 
 * @param {Request} req - Express request containing the current refresh token.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware pipeline helper.
 * @returns {Promise<void>}
 */
export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const tokens = await refreshTokens(refreshToken);
    res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
}

/**
 * Express Controller: User Logout.
 * Revokes current access token and clears refresh tokens.
 * Responds with HTTP status 204 No Content on success.
 * 
 * @param {Request} req - Express request containing the active user profile attached by auth middleware.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware pipeline helper.
 * @returns {Promise<void>}
 */
export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // req.user is guaranteed to exist due to 'authenticate' middleware
    const userId = req.user!.id;
    const authHeader = req.headers.authorization!;
    const accessToken = authHeader.split(' ')[1];

    await logout(userId, accessToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// FICHIER SUIVANT : backend/src/modules/auth/auth.routes.ts
