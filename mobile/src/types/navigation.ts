// mobile/src/types/navigation.ts

/**
 * Expo Router Navigation Parameter Types.
 * Defines parameters expected by routes in the Lokali app.
 */
export type RootStackParamList = {
  // --- AUTH ROUTING GROUP ---
  '(auth)/login': undefined;
  '(auth)/register': undefined;

  // --- CLIENT/GUEST ROUTING GROUP ---
  '(tabs)/explore/index': undefined;
  '(tabs)/explore/annonces/[id]': { id: string };
  '(tabs)/explore/search-filters': undefined;
  
  '(tabs)/reservations/index': undefined;
  '(tabs)/reservations/[id]': { id: string };
  '(tabs)/reservations/[id]/paiement': { id: string };

  '(tabs)/chat/index': undefined;
  '(tabs)/chat/[userId]': { userId: string; contactName?: string };

  '(tabs)/profile/index': undefined;
  '(tabs)/profile/edit': undefined;
  '(tabs)/profile/stats': undefined;
  '(tabs)/profile/alertes': undefined;

  // --- LOUEUR/HOST ROUTING GROUP ---
  'loueur/dashboard': undefined;
  'loueur/biens/index': undefined;
  'loueur/biens/create': undefined;
  'loueur/biens/[id]': { id: string };
  'loueur/biens/[id]/edit': { id: string };
  'loueur/biens/[id]/photos': { id: string };
  'loueur/annonces/index': undefined;
  'loueur/annonces/create': { bienId: string };
  'loueur/annonces/[id]/edit': { id: string };
  'loueur/calendrier': undefined;
  'loueur/reservations/index': undefined;
  'loueur/reservations/[id]': { id: string };

  // --- ADMIN/MODERATION ROUTING GROUP ---
  'admin/dashboard': undefined;
  'admin/moderation/index': undefined;
  'admin/moderation/[id]': { id: string };
};

export type RoutePath = keyof RootStackParamList;

// Helper type to check parameters of a specific route path
export type RouteParams<T extends RoutePath> = RootStackParamList[T];

// FICHIER SUIVANT : mobile/src/api/client.ts
