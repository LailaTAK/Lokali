// mobile/src/hooks/useAuth.ts

import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { tokenStorage } from '../api/client';
import { client } from '../api/client';
import { ENDPOINTS } from '../constants/api';
import { router } from 'expo-router';

/**
 * Hook to manage authentication flows, state, and startup token verification.
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    clearAuth,
  } = useAuthStore();

  /**
   * Performs validation of local tokens on app launch.
   * Restores user state from database or logs out if token is expired/invalid.
   */
  const initializeAuth = async () => {
    try {
      const accessToken = await tokenStorage.getAccessToken();
      const refreshToken = await tokenStorage.getRefreshToken();

      if (!accessToken || !refreshToken) {
        clearAuth();
        return;
      }

      // 1. Decode or check profile to verify token freshness
      // We call the users profile endpoint with the special client instance
      // which automatically attaches the Bearer token in request headers.
      const userId = user?.id;
      if (userId) {
        try {
          const profileResponse = await client.get(ENDPOINTS.users.profile(userId));
          if (profileResponse.data) {
            updateUser(profileResponse.data);
            return;
          }
        } catch (profileErr) {
          console.warn('Profile restoration failed, trying token refresh:', profileErr);
        }
      }

      // 2. Fallback: Try rotating tokens if profile lookup failed
      const refreshResponse = await client.post(ENDPOINTS.auth.refresh, { refreshToken });
      if (refreshResponse.data) {
        const { accessToken: newAccess, refreshToken: newRefresh } = refreshResponse.data;
        await useAuthStore.getState().setTokens(newAccess, newRefresh);
      }
    } catch (error) {
      console.error('Failed to restore authentication on startup:', error);
      clearAuth();
      router.replace('/(auth)/login');
    }
  };

  /**
   * Redirects user to their appropriate landing dashboard route depending on their role.
   */
  const handleRoleRedirect = () => {
    if (!isAuthenticated || !user) {
      router.replace('/(auth)/login');
      return;
    }

    if (user.role === 'ADMINISTRATEUR') {
      router.replace('/admin/dashboard');
    } else if (user.role === 'LOUEUR') {
      router.replace('/loueur/dashboard');
    } else {
      router.replace('/(tabs)/explore/index');
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    initializeAuth,
    handleRoleRedirect,
  };
}

// FICHIER SUIVANT : mobile/src/hooks/useBiens.ts
