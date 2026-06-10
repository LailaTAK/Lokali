// backend/src/types/express.d.ts

/**
 * Global declaration modification to augment the Express Request interface,
 * allowing type-safe referencing of req.user inside controllers and routers.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';
        nom?: string;
        prenom?: string;
      };
    }
  }
}

export {};
