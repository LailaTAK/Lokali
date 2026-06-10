// mobile/app/(auth)/register.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/spacing';

// Define Zod registration schema
const registerSchema = z
  .object({
    nom: z.string().min(1, 'Le nom est obligatoire.'),
    prenom: z.string().min(1, 'Le prénom est obligatoire.'),
    email: z.string().min(1, "L'email est obligatoire.").email("L'adresse email est invalide."),
    telephone: z.string().optional(),
    motDePasse: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
      .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule.')
      .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre.'),
    confirmation: z.string().min(1, 'La confirmation est obligatoire.'),
    role: z.enum(['CLIENT', 'LOUEUR']),
    cguAccepted: z.boolean().refine(val => val === true, {
      message: 'Vous devez accepter les CGU pour continuer.',
    }),
  })
  .refine((data) => data.motDePasse === data.confirmation, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmation'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Registration Screen Screen.
 * Implements password validation indicators, CGU checkboxes, CLIENT/LOUEUR role toggle buttons,
 * and form validation handling via RHF+Zod.
 */
export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      motDePasse: '',
      confirmation: '',
      role: 'CLIENT',
      cguAccepted: false,
    },
  });

  // Watch password field to compute strength indicator
  const watchedPassword = watch('motDePasse', '');

  // Calculate password strength score from 0 to 4
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length === 0) return 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(watchedPassword);

  const getStrengthMeta = () => {
    switch (strengthScore) {
      case 1:
        return { label: 'Faible', color: colors.light.error, width: '25%' };
      case 2:
        return { label: 'Moyen', color: colors.light.warning, width: '50%' };
      case 3:
        return { label: 'Bon', color: '#3182CE', width: '75%' };
      case 4:
        return { label: 'Excellent !', color: colors.light.success, width: '100%' };
      case 0:
      default:
        return { label: 'Très faible', color: colors.palette.gray[300], width: '0%' };
    }
  };

  const strengthMeta = getStrengthMeta();

  const onSubmit = async (data: RegisterFormData) => {
    setAuthError(null);
    try {
      await register({
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone,
        motDePasse: data.motDePasse,
        role: data.role,
      });
      // useAuth automatically routes to landing explorer/dashboard screen
    } catch (err: any) {
      if (err.response?.status === 409) {
        setAuthError('Cette adresse email est déjà enregistrée.');
      } else {
        setAuthError('Une erreur est survenue lors de la création du compte.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez la communauté Lokali en quelques secondes.</Text>

          {authError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.light.error} />
              <Text style={styles.errorBannerText}>{authError}</Text>
            </View>
          )}

          {/* Rôle selector toggle */}
          <Text style={styles.sectionLabel}>Je souhaite être :</Text>
          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <View style={styles.roleToggleContainer}>
                <Pressable
                  onPress={() => onChange('CLIENT')}
                  style={[
                    styles.roleOption,
                    value === 'CLIENT' && styles.roleOptionActive,
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={value === 'CLIENT' ? colors.palette.white : colors.light.text}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      value === 'CLIENT' && styles.roleTextActive,
                    ]}
                  >
                    Locataire / Client
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onChange('LOUEUR')}
                  style={[
                    styles.roleOption,
                    value === 'LOUEUR' && styles.roleOptionActive,
                  ]}
                >
                  <Ionicons
                    name="home-outline"
                    size={20}
                    color={value === 'LOUEUR' ? colors.palette.white : colors.light.text}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      value === 'LOUEUR' && styles.roleTextActive,
                    ]}
                  >
                    Propriétaire / Hôte
                  </Text>
                </Pressable>
              </View>
            )}
          />

          {/* First Name Input */}
          <Controller
            control={control}
            name="prenom"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Prénom"
                placeholder="Ex: Jean"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.prenom?.message}
              />
            )}
          />

          {/* Last Name Input */}
          <Controller
            control={control}
            name="nom"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nom"
                placeholder="Ex: Dupont"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.nom?.message}
              />
            )}
          />

          {/* Email Input */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Adresse email"
                placeholder="jean.dupont@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.palette.gray[400]} />}
              />
            )}
          />

          {/* Phone Input */}
          <Controller
            control={control}
            name="telephone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Numéro de téléphone (optionnel)"
                placeholder="+221 77 123 4567"
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.telephone?.message}
                leftIcon={<Ionicons name="call-outline" size={18} color={colors.palette.gray[400]} />}
              />
            )}
          />

          {/* Password Input */}
          <Controller
            control={control}
            name="motDePasse"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Mot de passe"
                placeholder="Au moins 8 caractères"
                secureTextEntry={true}
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.motDePasse?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.palette.gray[400]} />}
              />
            )}
          />

          {/* Password Strength Indicator */}
          {watchedPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBarBackground}>
                <View
                  style={[
                    styles.strengthBarFill,
                    { width: strengthMeta.width as any, backgroundColor: strengthMeta.color },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: strengthMeta.color }]}>
                Force : {strengthMeta.label}
              </Text>
            </View>
          )}

          {/* Confirm Password Input */}
          <Controller
            control={control}
            name="confirmation"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirmer le mot de passe"
                placeholder="Ressaisissez votre mot de passe"
                secureTextEntry={true}
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.confirmation?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.palette.gray[400]} />}
              />
            )}
          />

          {/* Terms Agreement Checkbox */}
          <Controller
            control={control}
            name="cguAccepted"
            render={({ field: { onChange, value } }) => (
              <View style={styles.checkboxWrapper}>
                <Pressable
                  onPress={() => onChange(!value)}
                  style={[
                    styles.checkbox,
                    value ? styles.checkboxChecked : null,
                    errors.cguAccepted ? styles.checkboxError : null,
                  ]}
                >
                  {value ? <Ionicons name="checkmark" size={14} color={colors.palette.white} /> : null}
                </Pressable>
                <Text style={styles.checkboxLabel}>
                  J'accepte les{' '}
                  <Text style={styles.checkboxLink} onPress={() => Alert.alert('CGU', 'Conditions Générales d\'Utilisation de Lokali...')}>
                    Conditions Générales d'Utilisation
                  </Text>{' '}
                  et la politique de confidentialité.
                </Text>
              </View>
            )}
          />
          {errors.cguAccepted && (
            <Text style={styles.cguErrorText}>{errors.cguAccepted.message}</Text>
          )}

          {/* Register Submit button */}
          <Button
            label="Créer mon compte"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            fullWidth={true}
            style={styles.submitBtn}
          />

          {/* Footer Back navigation link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Déjà inscrit ? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.loginLinkText}>Se connecter</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.md,
  },
  formCard: {
    backgroundColor: colors.light.surface,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorBannerText: {
    flex: 1,
    color: colors.light.error,
    fontSize: fontSize.xs + 1,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.palette.gray[100],
    padding: 4,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  roleOptionActive: {
    backgroundColor: colors.light.primary,
  },
  roleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginLeft: spacing.xs,
  },
  roleTextActive: {
    color: colors.palette.white,
  },
  strengthContainer: {
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  strengthBarBackground: {
    height: 4,
    backgroundColor: colors.palette.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
    marginTop: 4,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  checkboxError: {
    borderColor: colors.light.error,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: fontSize.xs + 1,
    color: colors.light.text,
    lineHeight: 18,
  },
  checkboxLink: {
    color: colors.light.primary,
    fontWeight: fontWeight.semibold,
  },
  cguErrorText: {
    fontSize: fontSize.xs,
    color: colors.light.error,
    marginBottom: spacing.md,
    fontWeight: fontWeight.medium,
  },
  submitBtn: {
    marginTop: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.light.textMuted,
    fontSize: fontSize.sm,
  },
  loginLinkText: {
    color: colors.light.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

// FICHIER SUIVANT : mobile/app/(auth)/forgot-password.tsx
