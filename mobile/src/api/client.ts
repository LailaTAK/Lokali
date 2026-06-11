// mobile/src/api/client.ts

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL, TIMEOUT } from '../constants/api';

// --- TOKEN STORAGE MANAGER ---

const ACCESS_TOKEN_KEY = 'lokali_access_token';
const REFRESH_TOKEN_KEY = 'lokali_refresh_token';

// Fallback in-memory storage for non-native environments (like web test runners or Jest)
let _accessTokenMemory: string | null = null;
let _refreshTokenMemory: string | null = null;

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return _accessTokenMemory;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch {
      _accessTokenMemory = token;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return _refreshTokenMemory;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch {
      _refreshTokenMemory = token;
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
    _accessTokenMemory = null;
    _refreshTokenMemory = null;
  },
};

// --- AUTH QUEUE FOR CONCURRENT 401 RETRIES ---

interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// --- AXIOS CLIENT CONFIGURATION ---

export const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: automatically inject Authorization Bearer token if present
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: intercept errors, handle 401 by rotating refresh tokens
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If response is not a 401 error, or request has already been retried, propagate the error
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If refresh token endpoint itself returns 401, clear tokens and redirect to login
    if (originalRequest.url?.includes('/auth/refresh')) {
      await tokenStorage.clearTokens();
      router.replace('/login');
      return Promise.reject(error);
    }

    // If another refresh process is already active, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return client(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    // Flag request as retried and enter refresh mode
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Perform token rotation exchange with the backend
      const response = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      // Save the rotated tokens in secure storage
      await tokenStorage.setAccessToken(newAccessToken);
      if (newRefreshToken) {
        await tokenStorage.setRefreshToken(newRefreshToken);
      }

      // Process queued requests with the new token
      processQueue(null, newAccessToken);

      // Re-run the initial failed request with the new access token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return client(originalRequest);
    } catch (refreshError) {
      // Invalidate tokens, reject queue, and force exit to login
      processQueue(refreshError, null);
      await tokenStorage.clearTokens();
      router.replace('/login');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
