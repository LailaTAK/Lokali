// mobile/src/services/storage.service.ts

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/models';

const ACCESS_TOKEN_KEY = 'lokali_access_token';
const REFRESH_TOKEN_KEY = 'lokali_refresh_token';
const USER_PROFILE_KEY = 'lokali_user_profile';

export interface SavedTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Storage service utility managing local cache persistence.
 * Uses keychain-backed SecureStore for credential tokens and AsyncStorage for standard profiles.
 */
export const storageService = {
  /**
   * Persists authentication token strings.
   * 
   * @param {string} accessToken - JWT Access token.
   * @param {string} refreshToken - JWT Refresh token.
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },

  /**
   * Restores persisted credentials.
   * 
   * @returns {Promise<SavedTokens>} Token string pair.
   */
  async getTokens(): Promise<SavedTokens> {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return { accessToken, refreshToken };
  },

  /**
   * Clears saved tokens.
   */
  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  /**
   * Persists the serialized user profile record.
   * 
   * @param {User} user - User profile object.
   */
  async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
  },

  /**
   * Restores user profile details.
   * 
   * @returns {Promise<User | null>} The parsed profile object.
   */
  async getUser(): Promise<User | null> {
    const serialized = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (!serialized) return null;
    try {
      return JSON.parse(serialized) as User;
    } catch {
      return null;
    }
  },

  /**
   * Clears saved user profile.
   */
  async clearUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
  },
};
