// mobile/app/(auth)/login.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
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
import { spacing, fontSize, fontWeight } from '../../src/constants/spacing';

// Define Zod validation schema
const loginSchema = z.object({
  email: z.string().min(1, "L'email est obligatoire.").email("L'adresse email est invalide."),
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire."),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login Screen Screen.
 * Implements validation using React Hook Form and Zod resolvers, keyboard adjustments,
 * and calls the authentication hook with appropriate 401 handling blocks.
 */
export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      motDePasse: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    try {
      await login(data.email, data.motDePasse);
      // useAuth redirect handles target dashboard selection based on roles automatically
    } catch (err: any) {
      // Handle login error, e.g. 401
      if (err.response?.status === 401) {
        setAuthError('Adresse email ou mot de passe incorrect.');
      } else if (err.response?.status === 403) {
        setAuthError(err.response?.data?.message || 'Ce compte a été désactivé.');
      } else {
        setAuthError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo and Brand Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoWrapper}>
            <Ionicons name="home" size={42} color={colors.palette.white} />
          </View>
          <Text style={styles.brandName}>LOKALI</Text>
          <Text style={styles.tagline}>Trouvez votre chez-vous en quelques clics</Text>
        </View>

        {/* Form panel container */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Connexion</Text>
          
          {/* General Auth Server error displays */}
          {authError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.light.error} />
              <Text style={styles.errorBannerText}>{authError}</Text>
            </View>
          )}

          {/* Email input field */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Adresse email"
                placeholder="Ex: jean.dupont@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
                leftIcon={<Ionicons name="mail-outline" size={20} color={colors.palette.gray[400]} />}
              />
            )}
          />

          {/* Password input field */}
          <Controller
            control={control}
            name="motDePasse"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Mot de passe"
                placeholder="Entrez votre mot de passe"
                secureTextEntry={true}
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.motDePasse?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.palette.gray[400]} />}
              />
            )}
          />

          {/* Forgot Password link */}
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable style={styles.forgotPasswordPressable}>
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </Pressable>
          </Link>

          {/* Login Action trigger */}
          <Button
            label="Se connecter"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            fullWidth={true}
            style={styles.submitButton}
          />

          {/* Footer Navigation link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Nouveau sur Lokali ? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={styles.registerLinkText}>Créer un compte</Text>
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
    justifyContent: 'center',
    padding: spacing.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  brandName: {
    fontSize: fontSize.xxxl - 4,
    fontWeight: fontWeight.heavy,
    color: colors.light.primary,
    marginTop: spacing.md,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: colors.light.surface,
    padding: spacing.xl,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
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
  forgotPasswordPressable: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.xs,
  },
  forgotPasswordText: {
    color: colors.light.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  submitButton: {
    marginTop: spacing.sm,
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
  registerLinkText: {
    color: colors.light.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

// FICHIER SUIVANT : mobile/app/(auth)/register.tsx
