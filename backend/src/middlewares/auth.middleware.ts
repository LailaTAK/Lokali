// backend/src/middlewares/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { redis } from '../config/redis';

/**
 * TypeScript interface representing the token payload format.
 */
export interface UserPayload {
  id: string;
  email: string;
  role: 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

/**
 * Retrieves the user details from Redis cache or from the database if not cached.
 * Caches database results in Redis for 1 hour (3600 seconds) to speed up future requests.
 * 
 * @param {string} userId - The unique identifier of the user.
 * @returns {Promise<UserPayload | null>} The user payload, or null if user does not exist.
 */
async function getOrCacheUser(userId: string): Promise<UserPayload | null> {
  const cacheKey = `user:${userId}`;

  try {
    // 1. Attempt to fetch from Redis
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      return JSON.parse(cachedUser) as UserPayload;
    }

    // 2. Fetch from Prisma database if missing from cache
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!dbUser) {
      return null;
    }

    // Map DB user to our exact payload interface
    const userPayload: UserPayload = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role as 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR',
    };

    // 3. Cache the retrieved user in Redis for 3600 seconds (1 hour)
    await redis.setex(cacheKey, 3600, JSON.stringify(userPayload));

    return userPayload;
  } catch (error) {
    console.error('Error in getOrCacheUser:', error);
    // Fail-soft to database query if Redis is down
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role as 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR',
        };
      }
    } catch (dbError) {
      console.error('Database fallback failed in getOrCacheUser:', dbError);
    }
    return null;
  }
}

/**
 * Express Middleware: strict user authentication.
 * Verifies the presence of the Bearer JWT in the Authorization header.
 * Responds with 401 Unauthorized if the token is missing, expired, or invalid.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication token is missing or malformed.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err: any) {
      const message = err.name === 'TokenExpiredError' ? 'Token has expired.' : 'Invalid token.';
      res.status(401).json({ error: message });
      return;
    }

    if (!decoded || !decoded.id) {
      res.status(401).json({ error: 'Token signature contains invalid claims.' });
      return;
    }

    const user = await getOrCacheUser(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User associated with this token no longer exists.' });
      return;
    }

    // Attach user information to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in authenticate middleware:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

/**
 * Express Middleware: optional user authentication.
 * If a valid Bearer JWT is provided, it extracts the user and attaches it to req.user.
 * If the token is missing or invalid, it does not throw an error or block the request,
 * allowing public endpoints to selectively customize responses based on login state.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      if (decoded && decoded.id) {
        const user = await getOrCacheUser(decoded.id);
        if (user) {
          req.user = user;
        }
      }
    } catch (err) {
      // Silently catch validation/expiration errors to allow public access
    }

    next();
  } catch (error) {
    console.error('Error in optionalAuth middleware:', error);
    next();
  }
}

// FICHIER SUIVANT : backend/src/middlewares/role.middleware.ts
