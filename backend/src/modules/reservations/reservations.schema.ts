// backend/src/modules/reservations/reservations.schema.ts

import { z } from 'zod';

/**
 * Validation schema for creating a booking reservation request.
 * Enforces start date in the future, chronological order, and max duration of 90 nights.
 */
export const createReservationSchema = z
  .object({
    annonceId: z.string().min(1, "L'identifiant de l'annonce est obligatoire."),
    dateDebut: z.preprocess((val) => new Date(String(val)), z.date({
      required_error: 'La date de début est obligatoire.',
      invalid_type_error: 'Format de date de début invalide.',
    })),
    dateFin: z.preprocess((val) => new Date(String(val)), z.date({
      required_error: 'La date de fin est obligatoire.',
      invalid_type_error: 'Format de date de fin invalide.',
    })),
    message: z.string().optional(),
  })
  .refine(
    (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(data.dateDebut);
      start.setHours(0, 0, 0, 0);
      return start >= today;
    },
    {
      message: 'La date de début doit être aujourd\'hui ou dans le futur.',
      path: ['dateDebut'],
    }
  )
  .refine(
    (data) => {
      return data.dateFin.getTime() > data.dateDebut.getTime();
    },
    {
      message: 'La date de fin doit être strictement supérieure à la date de début.',
      path: ['dateFin'],
    }
  )
  .refine(
    (data) => {
      const diffTime = Math.abs(data.dateFin.getTime() - data.dateDebut.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 90;
    },
    {
      message: 'La durée maximale de réservation est de 90 nuits.',
      path: ['dateFin'],
    }
  );

/**
 * Validation schema for updating a reservation status.
 */
export const updateStatutSchema = z.object({
  statut: z.enum(['CONFIRMEE', 'ANNULEE'], {
    errorMap: () => ({ message: 'Le statut doit être CONFIRMEE ou ANNULEE.' }),
  }),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateStatutInput = z.infer<typeof updateStatutSchema>;

// FICHIER SUIVANT : backend/src/modules/reservations/reservations.service.ts
