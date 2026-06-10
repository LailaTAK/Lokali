// mobile/src/constants/api.ts

/**
 * Resolves the appropriate backend API base URL depending on environment settings.
 * If EXPO_PUBLIC_API_URL is defined, it will use that.
 * Fallbacks are configured for Localhost development:
 * - 10.0.2.2 is the Android Virtual Device (AVD) loopback alias.
 * - localhost is used for iOS Simulator, Web or standard development.
 */
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__
    ? 'http://10.0.2.2:5000/api' // default for Android emulator targeting local backend
    : 'https://api.lokali.com/api');

export const TIMEOUT = 10000; // 10 seconds timeout

export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  users: {
    profile: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    avatar: (id: string) => `/users/${id}/avatar`,
    password: (id: string) => `/users/${id}/password`,
    stats: (id: string) => `/users/${id}/stats`,
  },
  biens: {
    list: '/biens',
    create: '/biens',
    details: (id: string) => `/biens/${id}`,
    update: (id: string) => `/biens/${id}`,
    delete: (id: string) => `/biens/${id}`,
    photos: (id: string) => `/biens/${id}/photos`,
    status: (id: string) => `/biens/${id}/status`,
  },
  annonces: {
    list: '/annonces',
    create: '/annonces',
    details: (id: string) => `/annonces/${id}`,
    update: (id: string) => `/annonces/${id}`,
    delete: (id: string) => `/annonces/${id}`,
    moderate: (id: string) => `/annonces/${id}/moderer`,
  },
  reservations: {
    list: '/reservations',
    create: '/reservations',
    details: (id: string) => `/reservations/${id}`,
    status: (id: string) => `/reservations/${id}/statut`,
    calendar: '/reservations/calendrier',
  },
  paiements: {
    initiate: '/paiements/initier',
    details: (id: string) => `/paiements/${id}`,
    list: '/paiements',
    confirm: '/paiements/webhook',
    refund: (id: string) => `/paiements/${id}/rembourser`,
  },
  messagerie: {
    conversations: '/messages/conversations',
    messages: (userId: string) => `/messages/${userId}`,
    unread: '/messages/non-lus',
  },
  alertes: {
    list: '/alertes',
    markRead: (id: string) => `/alertes/${id}/lu`,
    markAllRead: '/alertes/lu',
    unreadCount: '/alertes/non-lues',
  },
} as const;

// FICHIER SUIVANT : mobile/src/types/models.ts
