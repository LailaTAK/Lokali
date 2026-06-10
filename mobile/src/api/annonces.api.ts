// mobile/src/api/annonces.api.ts

import { client } from './client';
import { ENDPOINTS } from '../constants/api';
import { Annonce, PaginatedResponse } from '../types/models';

export interface CreateAnnoncePayload {
  titre: string;
  description: string;
  prixParNuit: number;
  bienId: string;
}

export interface UpdateAnnoncePayload extends Partial<CreateAnnoncePayload> {}

export interface SearchAnnonceParams {
  ville?: string;
  prixMin?: number;
  prixMax?: number;
  dateDebut?: string;
  dateFin?: string;
  nbPersonnes?: number;
  type?: string;
  equipements?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'prixAsc' | 'prixDesc' | 'dateAsc' | 'dateDesc' | 'populaire';
}

export interface ModererAnnoncePayload {
  statut: 'ACTIF' | 'REJETEE';
  motifRejet?: string;
}

/**
 * Searches and lists moderated and approved announcements with filter arguments.
 * 
 * @param {SearchAnnonceParams} [params] - Search parameters (dates, prices, locations).
 * @returns {Promise<PaginatedResponse<Annonce>>} Paginated list of announcements.
 */
export async function getAnnonces(params?: SearchAnnonceParams): Promise<PaginatedResponse<Annonce>> {
  const response = await client.get<PaginatedResponse<Annonce>>(ENDPOINTS.annonces.list, { params });
  return response.data;
}

/**
 * Retrieves announcement details, parent property information, host details, and reviews.
 * 
 * @param {string} id - Announcement ID.
 * @returns {Promise<Annonce>} Detailed announcement.
 */
export async function getAnnonceById(id: string): Promise<Annonce> {
  const response = await client.get<Annonce>(ENDPOINTS.annonces.details(id));
  return response.data;
}

/**
 * Publishes a new property announcement listing.
 * 
 * @param {CreateAnnoncePayload} payload - The announcement parameters.
 * @returns {Promise<Annonce>} The created announcement.
 */
export async function createAnnonce(payload: CreateAnnoncePayload): Promise<Annonce> {
  const response = await client.post<Annonce>(ENDPOINTS.annonces.create, payload);
  return response.data;
}

/**
 * Updates parameters of an existing announcement.
 * 
 * @param {string} id - Announcement ID.
 * @param {UpdateAnnoncePayload} payload - The parameters to modify.
 * @returns {Promise<Annonce>} The updated announcement.
 */
export async function updateAnnonce(id: string, payload: UpdateAnnoncePayload): Promise<Annonce> {
  const response = await client.put<Annonce>(ENDPOINTS.annonces.update(id), payload);
  return response.data;
}

/**
 * Archives an announcement listing (soft-delete).
 * 
 * @param {string} id - Announcement ID.
 * @returns {Promise<void>}
 */
export async function deleteAnnonce(id: string): Promise<void> {
  await client.delete(ENDPOINTS.annonces.delete(id));
}

/**
 * Moderates a pending announcement listing. (Administrators only)
 * 
 * @param {string} id - Announcement ID.
 * @param {ModererAnnoncePayload} payload - Moderation result (ACTIF/REJETEE).
 * @returns {Promise<Annonce>} The moderated announcement.
 */
export async function modererAnnonce(id: string, payload: ModererAnnoncePayload): Promise<Annonce> {
  const response = await client.patch<Annonce>(ENDPOINTS.annonces.moderate(id), payload);
  return response.data;
}

/**
 * Checks listing availability for a booking date range.
 * 
 * @param {string} annonceId - Announcement ID.
 * @param {string} dateDebut - Start check-in date.
 * @param {string} dateFin - End check-out date.
 * @returns {Promise<boolean>} True if listing is available, false if blocked or occupied.
 */
export async function checkDisponibilite(
  annonceId: string,
  dateDebut: string,
  dateFin: string
): Promise<boolean> {
  const searchParams: SearchAnnonceParams = {
    dateDebut,
    dateFin,
  };
  const response = await getAnnonces(searchParams);
  // If the announcement is returned in the list, it means it has no overlapping bookings
  return response.data.some((a) => a.id === annonceId);
}

// FICHIER SUIVANT : mobile/src/api/reservations.api.ts
