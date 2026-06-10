// backend/src/modules/annonces/annonces.schema.ts

import { z } from 'zod';
import { bienTypeEnum } from '../biens/biens.schema';

/**
 * Validation schema for creating a new property announcement (listing).
 */
export const createAnnonceSchema = z.object({
  titre: z.string().min(5, 'Le titre doit faire au moins 5 caractères.'),
  description: z.string().min(15, 'La description doit faire au moins 15 caractères.'),
  prixParNuit: z.preprocess((val) => Number(val), z.number().positive('Le prix par nuit doit être supérieur à 0.')),
  bienId: z.string().min(1, 'L\'identifiant du bien immobilier associé est obligatoire.'),
});

/**
 * Validation schema for modifying an existing property announcement.
 * All fields are optional.
 */
export const updateAnnonceSchema = createAnnonceSchema.partial();

/**
 * Validation schema for moderating an announcement.
 * Status can be set to ACTIF (approved) or REJETEE (rejected).
 * Requires a motifRejet (rejection motif) if the status is set to REJETEE.
 */
export const modererAnnonceSchema = z
  .object({
    statut: z.enum(['ACTIF', 'REJETEE'], {
      errorMap: () => ({ message: 'Le statut de modération doit être ACTIF ou REJETEE.' }),
    }),
    motifRejet: z.string().optional(),
  })
  .refine(
    (data) => data.statut !== 'REJETEE' || (data.motifRejet && data.motifRejet.trim().length > 0),
    {
      message: 'Un motif de rejet est obligatoire lorsque l\'annonce est rejetée.',
      path: ['motifRejet'],
    }
  );

/**
 * Validation schema for searching announcements.
 * Supports filtering by city, price limits, booking availability dates,
 * guest capacity, property type, amenities, sorting parameters, and pagination.
 */
export const searchAnnonceSchema = z.object({
  ville: z.string().optional(),
  prixMin: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  prixMax: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  dateDebut: z.preprocess((val) => (val ? new Date(String(val)) : undefined), z.date().optional()),
  dateFin: z.preprocess((val) => (val ? new Date(String(val)) : undefined), z.date().optional()),
  nbPersonnes: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional()),
  type: bienTypeEnum.optional(),
  equipements: z.preprocess(
    (val) => {
      if (!val) return undefined;
      if (typeof val === 'string') return [val];
      return val;
    },
    z.array(z.string()).optional()
  ),
  page: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional()),
  limit: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional()),
  sortBy: z.enum(['prixAsc', 'prixDesc', 'dateAsc', 'dateDesc', 'populaire']).optional().default('dateDesc'),
});

export type CreateAnnonceInput = z.infer<typeof createAnnonceSchema>;
export type UpdateAnnonceInput = z.infer<typeof updateAnnonceSchema>;
export type ModererAnnonceInput = z.infer<typeof modererAnnonceSchema>;
export type SearchAnnonceInput = z.infer<typeof searchAnnonceSchema>;

// FICHIER SUIVANT : backend/src/modules/annonces/annonces.service.ts
