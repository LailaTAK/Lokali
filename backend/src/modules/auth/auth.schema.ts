// backend/src/modules/auth/auth.schema.ts

import { z } from 'zod';

/**
 * Validator schema for user registration.
 * Checks for a valid name, email, optional phone number, role,
 * and a password with at least 8 characters, one uppercase letter, and one number.
 */
export const registerSchema = z.object({
  nom: z.string().min(1, 'Le nom est obligatoire.'),
  prenom: z.string().min(1, 'Le prénom est obligatoire.'),
  email: z.string().email("L'adresse email est invalide."),
  telephone: z.string().optional(),
  motDePasse: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule.')
    .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre.'),
  role: z.enum(['CLIENT', 'LOUEUR'], {
    errorMap: () => ({ message: 'Le rôle doit être CLIENT ou LOUEUR.' }),
  }),
});

/**
 * Validator schema for user login.
 */
export const loginSchema = z.object({
  email: z.string().email("L'adresse email est invalide."),
  motDePasse: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

/**
 * Validator schema for token rotation.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Le refresh token est obligatoire.'),
});

// Infer TypeScript types from the Zod schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

// FICHIER SUIVANT : backend/src/modules/auth/auth.service.ts
