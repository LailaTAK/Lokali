// mobile/src/types/models.ts

// --- COMMON TYPES & WRAPPERS ---

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// --- ENUMS & ENUM-LIKE LITERAL TYPES ---

export type UserRole = 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';

export type BienType = 'APPARTEMENT' | 'MAISON' | 'STUDIO' | 'CHAMBRE';

export type BienStatut = 'DISPONIBLE' | 'EN_TRAVAUX' | 'INDISPONIBLE';

export type AnnonceStatut = 'EN_ATTENTE' | 'ACTIF' | 'REJETEE' | 'ARCHIVE';

export type ReservationStatut = 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE';

export type PaiementMethode = 'CARTE' | 'WAVE' | 'ORANGE_MONEY';

export type PaiementStatut = 'EN_ATTENTE' | 'PAYE' | 'REMBOURSE';

// --- DATA MODELS ---

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  role: UserRole;
  actif: boolean;
  adresse?: string | null;
  photo?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  role: UserRole;
  stats: {
    reservationsCount: number;
    totalAmountSpent?: number; // client only
    biensCount?: number;       // loueur only
    totalRevenue?: number;     // loueur only
    averageRating?: number;    // loueur only
  };
}

export interface Bien {
  id: string;
  titre: string;
  description: string;
  adresse: string;
  ville: string;
  superficie: number;
  nbPieces: number;
  loyer: number;
  type: BienType;
  equipements: string[];
  lat: number;
  lng: number;
  statut: BienStatut;
  photos: string[];
  photoUrls?: string[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  loueur?: Partial<User> & { id: string; nom: string; prenom: string; photo?: string | null; photoUrl?: string | null };
  loueurId: string;
}

export interface Annonce {
  id: string;
  titre: string;
  description: string;
  prixParNuit: number;
  statut: AnnonceStatut;
  motifRejet?: string | null;
  vues: number;
  createdAt: string;
  updatedAt: string;
  bienId: string;
  bien?: Bien;
  photoUrls?: string[];
  loueurPhotoUrl?: string | null;
}

export interface Reservation {
  id: string;
  checkIn: string;
  checkOut: string;
  nbNuits: number;
  montantTotal: number;
  statut: ReservationStatut;
  message?: string | null;
  rappelEnvoye: boolean;
  createdAt: string;
  updatedAt: string;
  annonceId: string;
  annonce?: Annonce;
  bienId: string;
  bien?: Bien;
  clientId: string;
  client?: Partial<User> & { id: string; nom: string; prenom: string; email: string };
  paiements?: Paiement[];
}

export interface Paiement {
  id: string;
  amount: number;
  methode: PaiementMethode;
  statut: PaiementStatut;
  reference: string;
  meta?: string | null;
  createdAt: string;
  updatedAt: string;
  reservationId: string;
  reservation?: Reservation;
}

export interface Message {
  id: string;
  contenu: string;
  lu: boolean;
  createdAt: string;
  updatedAt: string;
  expediteurId: string;
  destinataireId: string;
}

export interface Conversation {
  contact: {
    id: string;
    nom: string;
    prenom: string;
    photo: string | null;
    photoUrl: string | null;
  };
  lastMessage: Message;
  unreadCount: number;
}

export interface Alerte {
  id: string;
  type: string; // 'MODERATION' | 'RESERVATION' | 'MESSAGE' | etc.
  message: string;
  lu: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Avis {
  id: string;
  note: number;
  commentaire?: string | null;
  createdAt: string;
  updatedAt: string;
  bienId: string;
  clientId: string;
  client?: Partial<User> & { id: string; nom: string; prenom: string; photo?: string | null; clientPhotoUrl?: string | null };
}

// FICHIER SUIVANT : mobile/src/types/navigation.ts
