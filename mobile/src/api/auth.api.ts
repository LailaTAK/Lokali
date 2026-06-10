// mobile/src/api/auth.api.ts

import { client } from './client';
import { ENDPOINTS } from '../constants/api';
import { User, ApiResponse } from '../types/models';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  motDePasse: string;
  role: 'CLIENT' | 'LOUEUR';
}

export interface LoginPayload {
  email: string;
  motDePasse: string;
}

/**
 * Sends a registration request to the backend.
 * 
 * @param {RegisterPayload} payload - The registration form parameters.
 * @returns {Promise<AuthResponse>} The authenticated user and tokens.
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>(ENDPOINTS.auth.register, payload);
  return response.data;
}

/**
 * Sends a login request to the backend.
 * 
 * @param {LoginPayload} payload - Credentials containing email and password.
 * @returns {Promise<AuthResponse>} The authenticated user and token pair.
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>(ENDPOINTS.auth.login, payload);
  return response.data;
}

/**
 * Refreshes current authentication token pair.
 * 
 * @param {string} refreshToken - The current refresh token.
 * @returns {Promise<AuthTokens>} Updated access and refresh token pair.
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const response = await client.post<AuthTokens>(ENDPOINTS.auth.refresh, { refreshToken });
  return response.data;
}

/**
 * Logs out the authenticated user. Invalidate sessions on the backend.
 * 
 * @returns {Promise<void>}
 */
export async function logout(): Promise<void> {
  await client.post(ENDPOINTS.auth.logout);
}

// FICHIER SUIVANT : mobile/src/api/biens.api.ts
