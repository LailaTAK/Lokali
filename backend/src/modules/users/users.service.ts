// backend/src/modules/users/users.service.ts

import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { uploadFile, getSignedUrl } from '../../config/storage';
import { AppError } from '../../middlewares/error.middleware';
import { UpdateUserInput } from './users.schema';

export interface UserStats {
  role: 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';
  stats: {
    reservationsCount: number;
    totalAmountSpent?: number; // client only
    biensCount?: number;       // loueur only
    totalRevenue?: number;     // loueur only
    averageRating?: number;    // loueur only
  };
}

/**
 * Retrieves a user profile by ID. Checks Redis cache first (TTL 5 minutes).
 * Excludes sensitive fields like password and refresh token.
 * 
 * @param {string} id - The user ID.
 * @returns {Promise<any>} The user profile object.
 * @throws {AppError} If user does not exist.
 */
export async function getUserById(id: string): Promise<any> {
  const cacheKey = `user:profile:${id}`;

  try {
    // 1. Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // If profile has an S3 photo key, resolve a temporary signed URL for it
      if (parsed.photo && !parsed.photo.startsWith('http')) {
        try {
          parsed.photoUrl = await getSignedUrl(parsed.photo);
        } catch (s3Err) {
          console.error('Failed to sign cached avatar key:', s3Err);
        }
      }
      return parsed;
    }
  } catch (error) {
    console.error('Cache read error in getUserById:', error);
  }

  // 2. Fetch from database
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      adresse: true,
      photo: true,
      role: true,
      actif: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('Utilisateur non trouvé.', 404);
  }

  // Generate temporary signed photo URL if key is saved
  let userPayload: any = { ...user, photoUrl: null };
  if (user.photo && !user.photo.startsWith('http')) {
    try {
      userPayload.photoUrl = await getSignedUrl(user.photo);
    } catch (s3Err) {
      console.error('Failed to sign avatar key:', s3Err);
    }
  }

  // 3. Cache the user profile in Redis for 5 minutes (300 seconds)
  try {
    await redis.setex(cacheKey, 300, JSON.stringify(user));
  } catch (cacheErr) {
    console.error('Failed to cache user profile:', cacheErr);
  }

  return userPayload;
}

/**
 * Updates user profile details in the database and invalidates their Redis cache.
 * 
 * @param {string} id - The user ID.
 * @param {UpdateUserInput} data - Key-values to update.
 * @returns {Promise<any>} The updated user profile.
 */
export async function updateUser(id: string, data: UpdateUserInput): Promise<any> {
  // Update database record
  const updatedUser = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      adresse: true,
      photo: true,
      role: true,
      actif: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Invalidate Redis profile cache and main user payload cache
  await redis.del(`user:profile:${id}`);
  await redis.del(`user:${id}`);

  // Resolve signed photo URL if key exists
  let response: any = { ...updatedUser, photoUrl: null };
  if (updatedUser.photo && !updatedUser.photo.startsWith('http')) {
    try {
      response.photoUrl = await getSignedUrl(updatedUser.photo);
    } catch (s3Err) {
      console.error('Failed to sign avatar key on update:', s3Err);
    }
  }

  return response;
}

/**
 * Uploads an avatar image to AWS S3, saves the key in the user's profile,
 * and invalidates caches.
 * 
 * @param {string} id - The user ID.
 * @param {Express.Multer.File} file - Multer uploaded file object.
 * @returns {Promise<{ photoUrl: string }>} The new avatar signed URL.
 */
export async function uploadAvatar(id: string, file: Express.Multer.File): Promise<{ photoUrl: string }> {
  // 1. Upload to AWS S3
  const s3Key = await uploadFile(file);

  // 2. Update user profile photo key in database
  await prisma.user.update({
    where: { id },
    data: { photo: s3Key },
  });

  // 3. Evict cache entries
  await redis.del(`user:profile:${id}`);
  await redis.del(`user:${id}`);

  // 4. Generate direct temporary signed URL
  const photoUrl = await getSignedUrl(s3Key);

  return { photoUrl };
}

/**
 * Verifies the old password, hashes and updates to the new password,
 * and revokes refresh tokens to force re-authentication across devices.
 * 
 * @param {string} id - The user ID.
 * @param {string} ancien - Current plain password.
 * @param {string} nouveau - New password.
 * @returns {Promise<void>}
 * @throws {AppError} If current password verification fails.
 */
export async function changePassword(id: string, ancien: string, nouveau: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('Utilisateur non trouvé.', 404);
  }

  // 1. Compare current password
  const isMatch = await bcrypt.compare(ancien, user.motDePasse);
  if (!isMatch) {
    throw new AppError("Le mot de passe actuel est incorrect.", 400);
  }

  // 2. Hash new password (12 rounds)
  const hashedNewPassword = await bcrypt.hash(nouveau, 12);

  // 3. Update database and revoke refresh tokens
  await prisma.user.update({
    where: { id },
    data: {
      motDePasse: hashedNewPassword,
      refreshToken: null,
    },
  });

  // 4. Invalidate caches
  await redis.del(`user:profile:${id}`);
  await redis.del(`user:${id}`);
}

/**
 * Computes dashboard usage statistics depending on the user's role.
 * 
 * @param {string} id - The user ID.
 * @returns {Promise<UserStats>} Custom role-dependent metrics.
 * @throws {AppError} If user is not found.
 */
export async function getUserStats(id: string): Promise<UserStats> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });

  if (!user) {
    throw new AppError('Utilisateur non trouvé.', 404);
  }

  const role = user.role as 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';

  if (role === 'LOUEUR') {
    // 1. Number of properties published
    const biensCount = await prisma.bien.count({
      where: { loueurId: id },
    });

    // 2. Number of reservations on host properties
    const reservationsCount = await prisma.reservation.count({
      where: {
        bien: { loueurId: id },
      },
    });

    // 3. Sum of paid payments received
    const paymentsSum = await prisma.paiement.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        statut: 'PAYE',
        reservation: {
          bien: { loueurId: id },
        },
      },
    });

    // 4. Average rating of properties
    const ratingAvg = await prisma.avis.aggregate({
      _avg: {
        note: true,
      },
      where: {
        bien: { loueurId: id },
      },
    });

    return {
      role,
      stats: {
        reservationsCount,
        biensCount,
        totalRevenue: paymentsSum._sum.amount || 0,
        averageRating: ratingAvg._avg.note ? Number(ratingAvg._avg.note.toFixed(1)) : 0,
      },
    };
  } else {
    // Client (and fallback for admins) stats
    const reservationsCount = await prisma.reservation.count({
      where: { clientId: id },
    });

    const paymentsSum = await prisma.paiement.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        statut: 'PAYE',
        reservation: { clientId: id },
      },
    });

    return {
      role,
      stats: {
        reservationsCount,
        totalAmountSpent: paymentsSum._sum.amount || 0,
      },
    };
  }
}

// FICHIER SUIVANT : backend/src/modules/users/users.controller.ts
