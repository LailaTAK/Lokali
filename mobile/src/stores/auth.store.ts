// mobile/src/stores/auth.store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/models';
import * as authApi from '../api/auth.api';
import { tokenStorage } from '../api/client';
import { router } from 'expo-router';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, motDePasse: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, motDePasse) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login({ email, motDePasse });
          
          // Save tokens in secure keychain storage
          await tokenStorage.setAccessToken(data.tokens.accessToken);
          await tokenStorage.setRefreshToken(data.tokens.refreshToken);

          set({
            user: data.user,
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            isAuthenticated: true,
          });

          // Navigate to dashboard based on role
          if (data.user.role === 'ADMINISTRATEUR') {
            router.replace('/stats');
          } else if (data.user.role === 'LOUEUR') {
            router.replace('/dashboard');
          } else {
            router.replace('/');
          }
        } catch (error) {
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (payload) => {
        set({ isLoading: true });
        try {
          const data = await authApi.register(payload);

          // Save tokens in secure keychain storage
          await tokenStorage.setAccessToken(data.tokens.accessToken);
          await tokenStorage.setRefreshToken(data.tokens.refreshToken);

          set({
            user: data.user,
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            isAuthenticated: true,
          });

          router.replace('/');
        } catch (error) {
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch (error) {
          console.warn('Backend logout failed:', error);
        } finally {
          get().clearAuth();
          set({ isLoading: false });
          router.replace('/login');
        }
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      setTokens: async (accessToken, refreshToken) => {
        await tokenStorage.setAccessToken(accessToken);
        await tokenStorage.setRefreshToken(refreshToken);
        set({ accessToken, refreshToken });
      },

      clearAuth: () => {
        tokenStorage.clearTokens();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'lokali-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// FICHIER SUIVANT : mobile/src/stores/biens.store.ts
