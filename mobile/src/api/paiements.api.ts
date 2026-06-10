// mobile/src/api/paiements.api.ts

import { client } from './client';
import { ENDPOINTS } from '../constants/api';
import { Paiement } from '../types/models';

export interface InitierPaiementPayload {
  reservationId: string;
  methode: 'CARTE' | 'WAVE' | 'ORANGE_MONEY';
}

export interface PaymentInitiationResult {
  paiement: Paiement;
  paymentDetails: {
    clientSecret?: string; // Stripe PaymentIntent secret
    waveUrl?: string;      // Wave checkout URL
    ussdCode?: string;     // Orange Money USSD code
  };
}

/**
 * Initiates a new payment transaction for a confirmed reservation.
 * 
 * @param {InitierPaiementPayload} payload - Reservation ID and payment method chosen.
 * @returns {Promise<PaymentInitiationResult>} The initiated transaction record and gateway credentials.
 */
export async function initierPaiement(payload: InitierPaiementPayload): Promise<PaymentInitiationResult> {
  const response = await client.post<PaymentInitiationResult>(ENDPOINTS.paiements.initiate, payload);
  return response.data;
}

/**
 * Fetches transaction details of a payment by ID.
 * 
 * @param {string} id - Payment ID.
 * @returns {Promise<Paiement>} Detailed payment transaction.
 */
export async function getPaiementById(id: string): Promise<Paiement> {
  const response = await client.get<Paiement>(ENDPOINTS.paiements.details(id));
  return response.data;
}

/**
 * Fetches a list of payments matching filters for the authenticated user.
 * 
 * @returns {Promise<Paiement[]>} Array of user payments.
 */
export async function getPaiements(): Promise<Paiement[]> {
  const response = await client.get<Paiement[]>(ENDPOINTS.paiements.list);
  return response.data;
}

// FICHIER SUIVANT : mobile/src/api/messages.api.ts
