// backend/src/middlewares/role.middleware.ts

import { Request, Response, NextFunction } from 'express';

type UserRole = 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';

/**
 * Express Middleware: Role-based authorization.
 * Checks whether the authenticated user (req.user) is assigned a role
 * that matches one of the specified allowed roles.
 * Returns 401 Unauthorized if the user is not authenticated,
 * and 403 Forbidden if the user's role is not authorized.
 * 
 * @param {...UserRole[]} allowedRoles - The roles permitted to access the route.
 * @returns {(req: Request, res: Response, next: NextFunction) => void} Middleware function.
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Ensure user is authenticated and attached by the auth middleware
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized. Authentication is required to access this resource.' });
      return;
    }

    // 2. Validate the user's role against permitted values
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden. Access requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is "${req.user.role}".`,
      });
      return;
    }

    // 3. Authorized, proceed to the handler
    next();
  };
}

// FICHIER SUIVANT : backend/src/middlewares/validate.middleware.ts
