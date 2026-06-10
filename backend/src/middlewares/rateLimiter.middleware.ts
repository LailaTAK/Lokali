// backend/src/middlewares/rateLimiter.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

interface RateLimitResponse {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Checks rate limits in Redis using INCR and EXPIRE.
 * Implements fail-open behavior: if Redis fails, logs error and allows request.
 * 
 * @param {string} key - Redis key identifier.
 * @param {number} limit - Max requests allowed in the window.
 * @param {number} windowSeconds - Expiration window duration in seconds.
 * @returns {Promise<RateLimitResponse>} The rate limiting evaluation.
 */
async function rateLimitCheck(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResponse> {
  const fallbackResponse = { allowed: true, limit, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
  
  try {
    // 1. Increment the request count for this key
    const current = await redis.incr(key);

    // 2. If it's the first request in the window, set the key TTL
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    // 3. Check remaining requests
    const remaining = Math.max(0, limit - current);

    // 4. Retrieve key's time-to-live to calculate reset timestamp
    const ttl = await redis.ttl(key);
    const resetTime = Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000;

    return {
      allowed: current <= limit,
      limit,
      remaining,
      resetTime,
    };
  } catch (error) {
    logger.error(`❌ Redis rate limiter error for key "${key}":`, error);
    // Fail-open: do not block users if Redis goes offline
    return fallbackResponse;
  }
}

/**
 * Standard utility to apply rate limiting headers to the Express response.
 */
function setRateLimitHeaders(res: Response, info: RateLimitResponse): void {
  res.setHeader('X-RateLimit-Limit', info.limit);
  res.setHeader('X-RateLimit-Remaining', info.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000));
}

/**
 * Express Middleware: General API Rate Limiter.
 * Permits 100 requests per 15-minute window per IP address.
 */
export async function apiLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const key = `rate:api:${ip}`;
  const limit = 100;
  const windowSeconds = 15 * 60; // 15 minutes

  const limitInfo = await rateLimitCheck(key, limit, windowSeconds);
  setRateLimitHeaders(res, limitInfo);

  if (!limitInfo.allowed) {
    res.status(429).json({
      error: 'Too Many Requests.',
      message: 'You have exceeded the API request limit of 100 requests per 15 minutes. Please try again later.',
    });
    return;
  }

  next();
}

/**
 * Express Middleware: Auth Rate Limiter.
 * Permits 10 requests per 15-minute window per IP address for login/registration/refresh.
 */
export async function authLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const key = `rate:auth:${ip}`;
  const limit = 10;
  const windowSeconds = 15 * 60; // 15 minutes

  const limitInfo = await rateLimitCheck(key, limit, windowSeconds);
  setRateLimitHeaders(res, limitInfo);

  if (!limitInfo.allowed) {
    res.status(429).json({
      error: 'Too Many Requests.',
      message: 'Too many authentication attempts. Limit is 10 attempts per 15 minutes. Please try again later.',
    });
    return;
  }

  next();
}

/**
 * Express Middleware: Upload Rate Limiter.
 * Permits 20 file uploads per hour per authenticated user.
 * Falls back to client IP address if user is unauthenticated.
 */
export async function uploadLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const identifier = req.user ? req.user.id : (req.ip || req.socket.remoteAddress || 'unknown-ip');
  const key = `rate:upload:${identifier}`;
  const limit = 20;
  const windowSeconds = 60 * 60; // 1 hour

  const limitInfo = await rateLimitCheck(key, limit, windowSeconds);
  setRateLimitHeaders(res, limitInfo);

  if (!limitInfo.allowed) {
    res.status(429).json({
      error: 'Too Many Uploads.',
      message: 'You have exceeded the file upload limit of 20 uploads per hour. Please try again later.',
    });
    return;
  }

  next();
}

// FICHIER SUIVANT : backend/src/middlewares/error.middleware.ts
