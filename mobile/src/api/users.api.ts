// mobile/src/api/users.api.ts

import { client } from './client';
import { ENDPOINTS } from '../constants/api';
import { User } from '../types/models';

export interface UpdateUserProfilePayload {
  email?: string;
  telephone?: string;
  adresse?: string;
}

export interface ChangePasswordPayload {
  ancienMotDePasse: string;
  nouveauMotDePasse: string;
}

export async function updateUserProfile(
  id: string,
  payload: UpdateUserProfilePayload
): Promise<User> {
  const response = await client.put<User>(ENDPOINTS.users.update(id), payload);
  return response.data;
}

export async function changePassword(
  id: string,
  payload: ChangePasswordPayload
): Promise<{ message: string }> {
  const response = await client.post<{ message: string }>(ENDPOINTS.users.password(id), payload);
  return response.data;
}
