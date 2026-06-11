// mobile/app/(auth)/forgot-password.tsx

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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/spacing';

type StepType = 'email' | 'otp' | 'password';

/**
 * Forgot Password Flow Screen.
 * Implements a 3-step visual stepper: input email -> validation code (OTP) -> change password.
 */
export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<StepType>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email validations
  const handleSendEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Veuillez saisir une adresse email valide.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    
    try {
      // Simulate API call to send OTP code
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Alert.alert('Code envoyé', `Un code de réinitialisation a été envoyé à ${email}.`);
      setStep('otp');
    } catch (err) {
      setErrorMsg('Erreur de communication. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP validations
  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setErrorMsg('Le code de vérification doit comporter 6 chiffres.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // Simulate backend check (correct simulation code: e.g. 123456 or any 6 digit input)
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setStep('password');
    } catch (err) {
      setErrorMsg('Code invalide ou expiré.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password validations
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setErrorMsg('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setErrorMsg('Le mot de passe doit contenir une lettre majuscule et un chiffre.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // Simulate backend update
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Alert.alert(
        'Succès',
        'Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.',
        [{ text: 'Se connecter', onPress: () => router.replace('/login') }]
      );
    } catch (err) {
      setErrorMsg('Erreur lors du changement de mot de passe.');
    } finally {
      setIsLoading(false);
    }
  };

  // Stepper dot progress renderer
  const renderStepper = () => {
    const isStep1Active = step === 'email' || step === 'otp' || step === 'password';
    const isStep2Active = step === 'otp' || step === 'password';
    const isStep3Active = step === 'password';

    return (
      <View style={styles.stepperContainer}>
        {/* Step 1 dot */}
        <View style={[styles.stepDot, isStep1Active && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, isStep1Active && styles.stepDotTextActive]}>1</Text>
        </View>
        <View style={[styles.stepLine, isStep2Active && styles.stepLineActive]} />

        {/* Step 2 dot */}
        <View style={[styles.stepDot, isStep2Active && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, isStep2Active && styles.stepDotTextActive]}>2</Text>
        </View>
        <View style={[styles.stepLine, isStep3Active && styles.stepLineActive]} />

        {/* Step 3 dot */}
        <View style={[styles.stepDot, isStep3Active && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, isStep3Active && styles.stepDotTextActive]}>3</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Back navigation */}
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>

        <View style={styles.card}>
          {renderStepper()}

          {/* STEP 1: EMAIL INPUT SCREEN */}
          {step === 'email' && (
            <View>
              <Text style={styles.title}>Mot de passe oublié ?</Text>
              <Text style={styles.description}>
                Saisissez l'adresse email associée à votre compte. Nous vous enverrons un code à 6 chiffres pour réinitialiser votre mot de passe.
              </Text>

              {errorMsg && (
                <Text style={styles.errorMessageText}>{errorMsg}</Text>
              )}

              <Input
                label="Adresse email"
                placeholder="Ex: jean.dupont@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={setEmail}
                value={email}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.palette.gray[400]} />}
              />

              <Button
                label="Envoyer le code"
                onPress={handleSendEmail}
                loading={isLoading}
                fullWidth={true}
                style={styles.submitBtn}
              />
            </View>
          )}

          {/* STEP 2: CODE INPUT (OTP) SCREEN */}
          {step === 'otp' && (
            <View>
              <Text style={styles.title}>Saisir le code</Text>
              <Text style={styles.description}>
                Entrez le code de sécurité à 6 chiffres envoyé à l'adresse <Text style={styles.boldText}>{email}</Text>.
              </Text>

              {errorMsg && (
                <Text style={styles.errorMessageText}>{errorMsg}</Text>
              )}

              <Input
                label="Code de vérification"
                placeholder="Ex: 123456"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={setOtpCode}
                value={otpCode}
                leftIcon={<Ionicons name="key-outline" size={18} color={colors.palette.gray[400]} />}
              />

              <Button
                label="Vérifier le code"
                onPress={handleVerifyOtp}
                loading={isLoading}
                fullWidth={true}
                style={styles.submitBtn}
              />

              <Pressable onPress={handleSendEmail} style={styles.resendButton}>
                <Text style={styles.resendText}>Renvoyer le code</Text>
              </Pressable>
            </View>
          )}

          {/* STEP 3: RESET PASSWORD SCREEN */}
          {step === 'password' && (
            <View>
              <Text style={styles.title}>Nouveau mot de passe</Text>
              <Text style={styles.description}>
                Créez votre nouveau mot de passe de connexion sécurisé pour Lokali.
              </Text>

              {errorMsg && (
                <Text style={styles.errorMessageText}>{errorMsg}</Text>
              )}

              <Input
                label="Nouveau mot de passe"
                placeholder="Au moins 8 caractères"
                secureTextEntry={true}
                autoCapitalize="none"
                onChangeText={setNewPassword}
                value={newPassword}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.palette.gray[400]} />}
              />

              <Input
                label="Confirmer le mot de passe"
                placeholder="Confirmez votre nouveau mot de passe"
                secureTextEntry={true}
                autoCapitalize="none"
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.palette.gray[400]} />}
              />

              <Button
                label="Modifier le mot de passe"
                onPress={handleResetPassword}
                loading={isLoading}
                fullWidth={true}
                style={styles.submitBtn}
              />
            </View>
          )}
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
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.light.surface,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.light.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  boldText: {
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  errorMessageText: {
    color: colors.light.error,
    fontSize: fontSize.xs + 1,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    color: colors.light.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  // VISUAL STEPPER STYLES
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl + spacing.sm,
    marginTop: spacing.sm,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.palette.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.light.primary,
  },
  stepDotText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.palette.gray[500],
  },
  stepDotTextActive: {
    color: colors.palette.white,
  },
  stepLine: {
    flex: 0.15,
    height: 3,
    backgroundColor: colors.palette.gray[200],
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: colors.light.primary,
  },
});

// FICHIER SUIVANT : mobile/app/_layout.tsx
