// backend/src/modules/paiements/paiements.schema.ts

import { z } from 'zod';

export const methodePaiementEnum = z.enum(['WAVE', 'ORANGE_MONEY', 'CARTE'], {
  errorMap: () => ({ message: "La méthode de paiement doit être WAVE, ORANGE_MONEY ou CARTE." }),
});

/**
 * Validation schema for initiating a payment transaction.
 */
export const initierPaiementSchema = z.object({
  reservationId: z.string().min(1, 'L\'identifiant de la réservation est obligatoire.'),
  methode: methodePaiementEnum,
});

/**
 * Validation schema for Wave API Webhooks.
 */
export const webhookWaveSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    id: z.string(),
    amount: z.coerce.number(),
    currency: z.string(),
    status: z.enum(['succeeded', 'failed', 'processing']),
    client_reference_id: z.string(), // carries our reservationId
  }),
});

/**
 * Validation schema for Orange Money Webhooks.
 */
export const webhookOrangeMoneySchema = z.object({
  status: z.enum(['SUCCESS', 'FAIL', 'PENDING']),
  notif_token: z.string(),
  txnid: z.string(), // Orange Money transaction ID
  amount: z.coerce.number(),
  client_msisdn: z.string().optional(),
  ref: z.string(), // carries our reservationId
});

export type InitierPaiementInput = z.infer<typeof initierPaiementSchema>;
export type WebhookWaveInput = z.infer<typeof webhookWaveSchema>;
export type WebhookOrangeMoneyInput = z.infer<typeof webhookOrangeMoneySchema>;

// FICHIER SUIVANT : backend/src/modules/paiements/paiements.service.ts
