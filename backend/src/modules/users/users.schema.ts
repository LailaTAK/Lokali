// backend/src/modules/users/users.schema.ts

import { z } from 'zod';

/**
 * Validation schema for updating user profile fields.
 * All fields are optional, enabling partial updates.
 */
export const updateUserSchema = z.object({
  nom: z.string().min(1, 'Le nom ne peut pas être vide.').optional(),
  prenom: z.string().min(1, 'Le prénom ne peut pas être vide.').optional(),
  email: z.string().email("L'adresse email est invalide.").optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  photo: z.string().url("L'URL de la photo est invalide.").optional(),
});

/**
 * Validation schema for updating account passwords.
 * Requires the correct current password and a compliant new password.
 */
export const changePasswordSchema = z.object({
  ancienMotDePasse: z.string().min(1, 'Le mot de passe actuel est obligatoire.'),
  nouveauMotDePasse: z
    .string()
    .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.')
    .regex(/[A-Z]/, 'Le nouveau mot de passe doit contenir au moins une lettre majuscule.')
    .regex(/\d/, 'Le nouveau mot de passe doit contenir au moins un chiffre.'),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// FICHIER SUIVANT : backend/src/modules/users/users.service.ts
