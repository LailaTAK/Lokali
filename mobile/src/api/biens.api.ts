// mobile/src/api/biens.api.ts

import { client } from './client';
import { ENDPOINTS } from '../constants/api';
import { Bien, PaginatedResponse } from '../types/models';

export interface CreateBienPayload {
  titre: string;
  description: string;
  adresse: string;
  ville: string;
  superficie: number;
  nbPieces: number;
  loyer: number;
  type: 'APPARTEMENT' | 'MAISON' | 'STUDIO' | 'CHAMBRE';
  equipements?: string[];
}

export interface UpdateBienPayload extends Partial<CreateBienPayload> {}

export interface FilterBiensParams {
  ville?: string;
  type?: string;
  prixMin?: number;
  prixMax?: number;
  superficieMin?: number;
  nbPiecesMin?: number;
  lat?: number;
  lng?: number;
  rayon?: number;
  page?: number;
  limit?: number;
}

export interface BienDetailPayload {
  bien: Bien;
  annonces: any[];
  stats: {
    totalReservations: number;
    averageRating: number;
    reviewsCount: number;
  };
}

/**
 * Fetches a list of properties according to search filters.
 * 
 * @param {FilterBiensParams} [params] - Query filters.
 * @returns {Promise<PaginatedResponse<Bien>>} Paginated list of properties.
 */
export async function getBiens(params?: FilterBiensParams): Promise<PaginatedResponse<Bien>> {
  const response = await client.get<PaginatedResponse<Bien>>(ENDPOINTS.biens.list, { params });
  return response.data;
}

/**
 * Fetches detail properties statistics and linked announcements by ID.
 * 
 * @param {string} id - Property ID.
 * @returns {Promise<BienDetailPayload>} Property details.
 */
export async function getBienById(id: string): Promise<BienDetailPayload> {
  const response = await client.get<BienDetailPayload>(ENDPOINTS.biens.details(id));
  return response.data;
}

/**
 * Submits a new property listing creation payload.
 * 
 * @param {CreateBienPayload} payload - The property fields.
 * @returns {Promise<Bien>} The created property.
 */
export async function createBien(payload: CreateBienPayload): Promise<Bien> {
  const response = await client.post<Bien>(ENDPOINTS.biens.create, payload);
  return response.data;
}

/**
 * Submits updates for an existing property listing.
 * 
 * @param {string} id - Property ID.
 * @param {UpdateBienPayload} payload - Fields to modify.
 * @returns {Promise<Bien>} The updated property.
 */
export async function updateBien(id: string, payload: UpdateBienPayload): Promise<Bien> {
  const response = await client.put<Bien>(ENDPOINTS.biens.update(id), payload);
  return response.data;
}

/**
 * Soft deletes a property listing.
 * 
 * @param {string} id - Property ID.
 * @returns {Promise<void>}
 */
export async function deleteBien(id: string): Promise<void> {
  await client.delete(ENDPOINTS.biens.delete(id));
}

/**
 * Uploads local file photos to S3 and registers them under the property.
 * 
 * @param {string} id - Property ID.
 * @param {any[]} files - Array of files to upload (uri, type, name).
 * @returns {Promise<Bien>} The updated property with S3 image keys.
 */
export async function uploadPhotos(id: string, files: any[]): Promise<Bien> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('photos', file as any);
  });

  const response = await client.post<Bien>(ENDPOINTS.biens.photos(id), formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Modifies the availability status of a property listing.
 * 
 * @param {string} id - Property ID.
 * @param {'DISPONIBLE' | 'EN_TRAVAUX' | 'INDISPONIBLE'} statut - New availability status.
 * @returns {Promise<Bien>} The updated property.
 */
export async function changerStatut(id: string, statut: 'DISPONIBLE' | 'EN_TRAVAUX' | 'INDISPONIBLE'): Promise<Bien> {
  const response = await client.patch<Bien>(ENDPOINTS.biens.status(id), { statut });
  return response.data;
}

// FICHIER SUIVANT : mobile/src/api/annonces.api.ts
