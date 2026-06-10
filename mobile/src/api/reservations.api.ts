// mobile/src/api/reservations.api.ts

import { client } from './client';
import { ENDPOINTS } from '../constants/api';
import { Reservation, PaginatedResponse } from '../types/models';

export interface CreateReservationPayload {
  annonceId: string;
  dateDebut: string;
  dateFin: string;
  message?: string;
}

export interface FilterReservationsParams {
  statut?: 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE';
  page?: number;
  limit?: number;
}

/**
 * Creates a new booking reservation request.
 * 
 * @param {CreateReservationPayload} payload - The booking dates and listing ID parameters.
 * @returns {Promise<Reservation>} The created reservation request.
 */
export async function createReservation(payload: CreateReservationPayload): Promise<Reservation> {
  const response = await client.post<Reservation>(ENDPOINTS.reservations.create, payload);
  return response.data;
}

/**
 * Fetches a list of reservations for the authenticated user.
 * 
 * @param {FilterReservationsParams} [params] - Filters (status, pagination).
 * @returns {Promise<PaginatedResponse<Reservation>>} Paginated list of reservations.
 */
export async function getReservations(params?: FilterReservationsParams): Promise<PaginatedResponse<Reservation>> {
  const response = await client.get<PaginatedResponse<Reservation>>(ENDPOINTS.reservations.list, { params });
  return response.data;
}

/**
 * Retrieves reservation details by ID.
 * 
 * @param {string} id - The reservation ID.
 * @returns {Promise<Reservation>} The reservation object details.
 */
export async function getReservationById(id: string): Promise<Reservation> {
  const response = await client.get<Reservation>(ENDPOINTS.reservations.details(id));
  return response.data;
}

/**
 * Modifies the reservation status (Host confirming/canceling, Guest canceling).
 * 
 * @param {string} id - Reservation ID.
 * @param {'CONFIRMEE' | 'ANNULEE'} statut - Target status.
 * @returns {Promise<Reservation>} The updated reservation.
 */
export async function updateStatut(id: string, statut: 'CONFIRMEE' | 'ANNULEE'): Promise<Reservation> {
  const response = await client.patch<Reservation>(ENDPOINTS.reservations.status(id), { statut });
  return response.data;
}

/**
 * Retrieves all confirmed bookings calendar for the host dashboard calendar screen.
 * 
 * @returns {Promise<Reservation[]>} Confirmed bookings array.
 */
export async function getCalendrierLoueur(): Promise<Reservation[]> {
  const response = await client.get<Reservation[]>(ENDPOINTS.reservations.calendar);
  return response.data;
}

// FICHIER SUIVANT : mobile/src/api/paiements.api.ts
