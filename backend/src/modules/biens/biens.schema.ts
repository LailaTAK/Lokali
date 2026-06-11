// backend/src/modules/biens/biens.schema.ts

import { z } from 'zod';

export const bienTypeEnum = z.enum(['APPARTEMENT', 'MAISON', 'STUDIO', 'CHAMBRE'], {
  errorMap: () => ({ message: "Le type de bien doit être APPARTEMENT, MAISON, STUDIO ou CHAMBRE." }),
});

/**
 * Validation schema for creating a new property listing.
 */
export const createBienSchema = z.object({
  titre: z.string().min(3, 'Le titre doit faire au moins 3 caractères.'),
  description: z.string().min(10, 'La description doit faire au moins 10 caractères.'),
  adresse: z.string().min(5, "L'adresse doit contenir au moins 5 caracteres."),
  ville: z.string().min(1, 'La ville est obligatoire.'),
  superficie: z.preprocess((val) => Number(val), z.number().positive('La superficie doit être un nombre positif.')),
  nbPieces: z.preprocess((val) => Number(val), z.number().int().positive('Le nombre de pièces doit être un entier positif.')),
  loyer: z.preprocess((val) => Number(val), z.number().positive('Le loyer doit être un nombre positif.')),
  type: bienTypeEnum,
  equipements: z.array(z.string()).optional().default([]),
});

/**
 * Validation schema for modifying an existing property listing.
 * All fields are optional.
 */
export const updateBienSchema = createBienSchema.partial();

/**
 * Validation schema for filtering and searching properties.
 * Supports pagination, price/size boundaries, and geographic radius search.
 */
export const filterBiensSchema = z.object({
  ville: z.string().optional(),
  type: bienTypeEnum.optional(),
  prixMin: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  prixMax: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  superficieMin: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  nbPiecesMin: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional()),
  lat: z.preprocess((val) => (val ? Number(val) : undefined), z.number().min(-90).max(90).optional()),
  lng: z.preprocess((val) => (val ? Number(val) : undefined), z.number().min(-180).max(180).optional()),
  rayon: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()), // radius in km
  page: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional()),
  limit: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional()),
});

export type CreateBienInput = z.infer<typeof createBienSchema>;
export type UpdateBienInput = z.infer<typeof updateBienSchema>;
export type FilterBiensInput = z.infer<typeof filterBiensSchema>;

// FICHIER SUIVANT : backend/src/modules/biens/biens.upload.ts
