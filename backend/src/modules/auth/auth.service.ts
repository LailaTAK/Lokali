// backend/src/modules/auth/auth.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { setEx, del } from '../../config/redis';
import { sendWelcomeEmail } from '../../config/mailer';
import { AppError } from '../../middlewares/error.middleware';
import { RegisterInput } from './auth.schema';

export interface UserResponse {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

/**
 * Helper to generate access and refresh tokens for a user.
 * 
 * @param {string} id - User ID.
 * @param {string} email - User email address.
 * @param {string} role - User role (CLIENT, LOUEUR, ADMINISTRATEUR).
 * @returns {AuthTokens} Object containing the generated JWT access and refresh tokens.
 */
function generateTokens(id: string, email: string, role: string): AuthTokens {
  const accessToken = jwt.sign({ id, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  const refreshToken = jwt.sign({ id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });

  return { accessToken, refreshToken };
}

/**
 * Service handling user registration.
 * 
 * @param {RegisterInput} data - Inputs for registration.
 * @returns {Promise<AuthResponse>} The created user response and tokens.
 * @throws {AppError} If email is already in use.
 */
export async function register(data: RegisterInput): Promise<AuthResponse> {
  const { nom, prenom, email, telephone, motDePasse, role } = data;

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError('Cet email est déjà utilisé.', 409);
  }

  // 2. Hash password (salt rounds = 12)
  const hashedPassword = await bcrypt.hash(motDePasse, 12);

  // 3. Create user in PostgreSQL database (defaults actif to true)
  const user = await prisma.user.create({
    data: {
      nom,
      prenom,
      email,
      telephone: telephone || null,
      motDePasse: hashedPassword,
      role,
      actif: true,
    },
  });

  // 4. Send Welcome Email asynchronously
  sendWelcomeEmail(user.email, `${user.prenom} ${user.nom}`).catch((err) => {
    console.error('Failed to send welcome email in background:', err);
  });

  // 5. Generate Access & Refresh tokens
  const tokens = generateTokens(user.id, user.email, user.role);

  // 6. Hash refresh token to store securely in database
  const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  // 7. Store access token in Redis active cache (expires matching JWT_EXPIRES_IN, e.g. 15min)
  await setEx(`token:active:${tokens.accessToken}`, 15 * 60, user.id);

  // Prepare safe response (omit password)
  const userResponse: UserResponse = {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    telephone: user.telephone,
    role: user.role as 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR',
    actif: user.actif,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return {
    user: userResponse,
    tokens,
  };
}

/**
 * Service handling user login.
 * 
 * @param {string} email - The user's email address.
 * @param {string} motDePasse - The user's plain-text password.
 * @returns {Promise<AuthResponse>} The authenticated user and tokens.
 * @throws {AppError} If credentials are incorrect or account is inactive.
 */
export async function login(email: string, motDePasse: string): Promise<AuthResponse> {
  // 1. Retrieve user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Identifiants incorrects.', 401);
  }

  // 2. Validate password
  const isPasswordValid = await bcrypt.compare(motDePasse, user.motDePasse);
  if (!isPasswordValid) {
    throw new AppError('Identifiants incorrects.', 401);
  }

  // 3. Verify that user is active
  if (!user.actif) {
    throw new AppError('Ce compte a été désactivé par un administrateur.', 403);
  }

  // 4. Generate tokens
  const tokens = generateTokens(user.id, user.email, user.role);

  // 5. Save hashed refresh token in PostgreSQL
  const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  // 6. Put user profile in Redis cache (15min) to optimize auth middleware lookups
  const userPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  await setEx(`user:${user.id}`, 15 * 60, JSON.stringify(userPayload));

  // 7. Store access token in Redis active cache
  await setEx(`token:active:${tokens.accessToken}`, 15 * 60, user.id);

  const userResponse: UserResponse = {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    telephone: user.telephone,
    role: user.role as 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR',
    actif: user.actif,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return {
    user: userResponse,
    tokens,
  };
}

/**
 * Service handling token rotation. Validates the refresh token and
 * issues a new set of access and refresh tokens.
 * 
 * @param {string} refreshToken - The raw client refresh token.
 * @returns {Promise<AuthTokens>} The new generated access and refresh tokens.
 * @throws {AppError} If validation fails or refresh token is invalid/revoked.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let decoded: any;

  // 1. Verify token signature
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError('Token de rafraîchissement invalide ou expiré.', 401);
  }

  if (!decoded || !decoded.id) {
    throw new AppError('Token de rafraîchissement invalide.', 401);
  }

  // 2. Fetch user and check status
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user || !user.actif) {
    throw new AppError('Utilisateur non trouvé ou inactif.', 401);
  }

  // 3. Confirm matching hashed refresh token in database
  if (!user.refreshToken) {
    throw new AppError('Token de rafraîchissement révoqué.', 401);
  }

  const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isMatch) {
    throw new AppError('Token de rafraîchissement invalide.', 401);
  }

  // 4. Generate new pair of tokens (rotation)
  const tokens = generateTokens(user.id, user.email, user.role);

  // 5. Save new hashed refresh token in database
  const newHashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newHashedRefreshToken },
  });

  // 6. Cache new access token in Redis
  await setEx(`token:active:${tokens.accessToken}`, 15 * 60, user.id);

  return tokens;
}

/**
 * Service handling user logout.
 * Revokes the current access token and clears database refresh token.
 * 
 * @param {string} userId - ID of the user logging out.
 * @param {string} accessToken - Access token used to authorize the request.
 * @returns {Promise<void>}
 */
export async function logout(userId: string, accessToken: string): Promise<void> {
  // 1. Blacklist the current access token in Redis (15min duration)
  await setEx(`token:blacklist:${accessToken}`, 15 * 60, '1');

  // 2. Remove active access token cache entry
  await del(`token:active:${accessToken}`);

  // 3. Revoke the refresh token in PostgreSQL database
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  // 4. Evict user profile cache in Redis
  await del(`user:${userId}`);
}

// FICHIER SUIVANT : backend/src/modules/auth/auth.controller.ts
