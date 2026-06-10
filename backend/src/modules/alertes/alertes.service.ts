// backend/src/modules/alertes/alertes.service.ts

import admin from 'firebase-admin';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { parsePagination, buildPaginatedResponse, PaginatedResponse } from '../../utils/pagination';
import { logger } from '../../utils/logger';
import { AppError } from '../../middlewares/error.middleware';

let firebaseInitialized = false;

// Safely initialize Firebase Admin SDK using credentials parsed from environment variables
try {
  if (env.FIREBASE_SERVICE_ACCOUNT && env.FIREBASE_SERVICE_ACCOUNT.trim() !== '') {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    logger.info('🔥 Firebase Admin SDK initialized successfully for FCM push notifications.');
  } else {
    logger.warn('⚠️ FIREBASE_SERVICE_ACCOUNT is empty. Push notifications will run in mock mode.');
  }
} catch (error) {
  logger.error('❌ Failed to initialize Firebase Admin SDK. Push notifications will fallback to mock mode.', error);
}

/**
 * Creates and saves a new in-app notification alert for a user.
 * 
 * @param {string} userId - ID of the target user.
 * @param {string} type - Notification category (e.g. MODERATION, RESERVATION, MESSAGE).
 * @param {string} message - Notification text content.
 * @returns {Promise<any>} The created alert record.
 */
export async function createAlerte(userId: string, type: string, message: string): Promise<any> {
  const alerte = await prisma.alerte.create({
    data: {
      userId,
      type,
      message,
      lu: false,
    },
  });

  // Automatically trigger an asynchronous push notification in the background
  sendPushNotification(userId, `Nouveau message LOKALI (${type})`, message).catch((pushErr) => {
    logger.error(`Failed to send push notification alert to user #${userId} in background:`, pushErr);
  });

  return alerte;
}

/**
 * Retrieves a paginated list of alerts for a user.
 * Orders unread alerts (lu = false) first, then sorts descending by creation date.
 * 
 * @param {string} userId - The user ID.
 * @param {any} queryParams - Pagination filters (page, limit).
 * @returns {Promise<PaginatedResponse<any>>} Paginated results containing sorted alerts.
 */
export async function getAlertes(userId: string, queryParams: any): Promise<PaginatedResponse<any>> {
  const { page, limit, skip } = parsePagination({ page: queryParams.page, limit: queryParams.limit });
  const where = { userId };

  const total = await prisma.alerte.count({ where });
  const alertes = await prisma.alerte.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { lu: 'asc' }, // unread (false) first, then read (true)
      { createdAt: 'desc' }, // newest first
    ],
  });

  return buildPaginatedResponse(alertes, total, page, limit);
}

/**
 * Marks a specific alert as read. Verifies ownership.
 * 
 * @param {string} id - The alert ID.
 * @param {string} userId - The owner ID.
 * @returns {Promise<any>} The updated alert.
 * @throws {AppError} If alert does not exist or user is unauthorized.
 */
export async function marquerLue(id: string, userId: string): Promise<any> {
  const alerte = await prisma.alerte.findUnique({ where: { id } });

  if (!alerte) {
    throw new AppError('Alerte introuvable.', 404);
  }

  if (alerte.userId !== userId) {
    throw new AppError("Vous n'êtes pas autorisé à modifier cette alerte.", 403);
  }

  return await prisma.alerte.update({
    where: { id },
    data: { lu: true },
  });
}

/**
 * Marks all alerts belonging to a user as read.
 * 
 * @param {string} userId - The user ID.
 * @returns {Promise<void>}
 */
export async function marquerToutesLues(userId: string): Promise<void> {
  await prisma.alerte.updateMany({
    where: { userId, lu: false },
    data: { lu: true },
  });
}

/**
 * Counts the number of unread alerts for a user.
 * 
 * @param {string} userId - The user ID.
 * @returns {Promise<number>} Number of unread alerts.
 */
export async function getNombreNonLues(userId: string): Promise<number> {
  return await prisma.alerte.count({
    where: { userId, lu: false },
  });
}

/**
 * Dispatches a push notification to a user's mobile device via Firebase Cloud Messaging.
 * Retrieves the user's active FCM token from Redis cache.
 * 
 * @param {string} userId - The target user ID.
 * @param {string} titre - Push title.
 * @param {string} body - Push body text.
 * @returns {Promise<void>}
 */
export async function sendPushNotification(userId: string, titre: string, body: string): Promise<void> {
  try {
    // Retrieve FCM token registered by the mobile app for this user in Redis
    const fcmToken = await redis.get(`fcm:token:${userId}`);

    if (!fcmToken) {
      logger.debug(`No active FCM token found for user #${userId}. Skipping push notification.`);
      return;
    }

    if (!firebaseInitialized) {
      logger.debug(`[MOCK PUSH] Sending notification to user #${userId} (Token: ${fcmToken}): "${titre}" - "${body}"`);
      return;
    }

    // Deliver message payload via Google FCM service
    const message = {
      notification: {
        title: titre,
        body,
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    logger.info(`Successfully dispatched FCM push notification to user #${userId}. Message ID: ${response}`);
  } catch (error) {
    logger.error(`❌ Failed to send FCM push notification to user #${userId}:`, error);
  }
}

// FICHIER SUIVANT : backend/src/modules/alertes/alertes.worker.ts
