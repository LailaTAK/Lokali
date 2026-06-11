// mobile/app/(client)/parametres.tsx

import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { colors } from '../../src/constants/colors';
import { borderRadius, fontSize, fontWeight, spacing } from '../../src/constants/spacing';
import { updateUserProfile, changePassword } from '../../src/api/users.api';
import { useAuthStore } from '../../src/stores/auth.store';
import { UserRole } from '../../src/types/models';

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Client',
  LOUEUR: 'Loueur',
  ADMINISTRATEUR: 'Administrateur',
};

function formatDate(value?: string | null): string {
  if (!value) return 'Non renseigne';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Non renseigne';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function extractApiMessage(error: any, fallback: string): string {
  const validationSummary = error.response?.data?.errors
    ?.map((item: { message?: string }) => item.message)
    .filter(Boolean)
    .join('\n');

  return validationSummary || error.response?.data?.message || error.response?.data?.error || fallback;
}

export default function ParametresScreen() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;

    setEmail(user.email || '');
    setTelephone(user.telephone || '');
    setAdresse(user.adresse || '');
  }, [user]);

  const handleLogout = () => {
    Alert.alert('Se deconnecter', 'Voulez-vous vraiment quitter votre session Lokali ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se deconnecter',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const nextErrors: Record<string, string> = {};
    const trimmedEmail = email.trim();
    const trimmedTelephone = telephone.trim();
    const trimmedAdresse = adresse.trim();

    if (!trimmedEmail) {
      nextErrors.email = "L'adresse email est obligatoire.";
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      nextErrors.email = "L'adresse email est invalide.";
    }

    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSavingProfile(true);
    try {
      const updated = await updateUserProfile(user.id, {
        email: trimmedEmail,
        telephone: trimmedTelephone || undefined,
        adresse: trimmedAdresse || undefined,
      });
      updateUser(updated);
      Alert.alert('Profil mis a jour', 'Vos informations personnelles ont ete enregistrees.');
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        extractApiMessage(error, "Impossible de mettre a jour vos informations.")
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Le mot de passe actuel est obligatoire.');
      return;
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError('Le nouveau mot de passe doit contenir 8 caracteres, une majuscule et un chiffre.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePassword(user.id, {
        ancienMotDePasse: currentPassword,
        nouveauMotDePasse: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Mot de passe mis a jour', 'Votre nouveau mot de passe est actif.');
    } catch (error: any) {
      setPasswordError(extractApiMessage(error, 'Impossible de modifier le mot de passe.'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={15}>
            <Ionicons name="arrow-back" size={24} color={colors.light.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Parametres</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="person-circle-outline" size={48} color={colors.light.textMuted} />
          <Text style={styles.emptyTitle}>Session introuvable</Text>
          <Button label="Se connecter" onPress={() => router.replace('/login')} style={styles.emptyButton} />
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${user.prenom} ${user.nom}`.trim();
  const photoUri = user.photoUrl || user.photo || null;
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={15}>
            <Ionicons name="arrow-back" size={24} color={colors.light.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Parametres</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.profileCard} padding="xl" radius="lg">
            <View style={styles.profileHeader}>
              <Avatar uri={photoUri} prenom={user.prenom} nom={user.nom} size="lg" />
              <View style={styles.profileTextBlock}>
                <Text style={styles.profileName}>{fullName || 'Utilisateur Lokali'}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <View style={styles.roleBadge}>
                  <Ionicons name="person-outline" size={14} color={colors.light.primary} />
                  <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                </View>
              </View>
            </View>
          </Card>

          <Text style={styles.sectionLabel}>Informations personnelles</Text>
          <Card padding="lg" radius="lg" style={styles.formCard}>
            <Input
              label="Adresse email"
              placeholder="nom@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={profileErrors.email}
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.palette.gray[400]} />}
            />
            <Input
              label="Telephone"
              placeholder="+221 77 123 4567"
              keyboardType="phone-pad"
              value={telephone}
              onChangeText={setTelephone}
              leftIcon={<Ionicons name="call-outline" size={20} color={colors.palette.gray[400]} />}
            />
            <Input
              label="Adresse"
              placeholder="Quartier, ville"
              value={adresse}
              onChangeText={setAdresse}
              leftIcon={<Ionicons name="location-outline" size={20} color={colors.palette.gray[400]} />}
            />
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.light.textMuted} />
              <Text style={styles.metaText}>Membre depuis {formatDate(user.createdAt)}</Text>
            </View>
            <Button
              label="Enregistrer les informations"
              fullWidth
              loading={isSavingProfile}
              disabled={isSavingProfile}
              icon={<Ionicons name="save-outline" size={18} color={colors.palette.white} />}
              onPress={handleSaveProfile}
              style={styles.saveButton}
            />
          </Card>

          <Text style={styles.sectionLabel}>Mot de passe</Text>
          <Card padding="lg" radius="lg" style={styles.formCard}>
            {passwordError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.light.error} />
                <Text style={styles.errorBannerText}>{passwordError}</Text>
              </View>
            )}
            <Input
              label="Mot de passe actuel"
              placeholder="Votre mot de passe actuel"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.palette.gray[400]} />}
            />
            <Input
              label="Nouveau mot de passe"
              placeholder="8 caracteres, une majuscule, un chiffre"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              leftIcon={<Ionicons name="key-outline" size={20} color={colors.palette.gray[400]} />}
            />
            <Input
              label="Confirmer le nouveau mot de passe"
              placeholder="Repetez le nouveau mot de passe"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.palette.gray[400]} />}
            />
            <Button
              label="Modifier le mot de passe"
              fullWidth
              variant="outline"
              loading={isSavingPassword}
              disabled={isSavingPassword}
              onPress={handleChangePassword}
            />
          </Card>

          <Text style={styles.sectionLabel}>Session</Text>
          <Card padding="lg" radius="lg" style={styles.sessionCard}>
            <View style={styles.sessionTextBlock}>
              <Text style={styles.sessionTitle}>Compte connecte</Text>
              <Text style={styles.sessionSubtitle}>
                La deconnexion supprimera les jetons locaux et vous ramenera a l'ecran de connexion.
              </Text>
            </View>
            <Button
              label="Se deconnecter"
              variant="danger"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              icon={<Ionicons name="log-out-outline" size={18} color={colors.palette.white} />}
              onPress={handleLogout}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerBar: {
    height: 56,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    marginBottom: spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileTextBlock: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  profileEmail: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(83, 74, 183, 0.1)',
  },
  roleBadgeText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
  },
  formCard: {
    marginBottom: spacing.xl,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  metaText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
  },
  saveButton: {
    marginTop: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
  },
  errorBannerText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.xs + 1,
    fontWeight: fontWeight.semibold,
    color: colors.light.error,
  },
  sessionCard: {
    marginBottom: spacing.xl,
  },
  sessionTextBlock: {
    marginBottom: spacing.lg,
  },
  sessionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  sessionSubtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: colors.light.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  emptyButton: {
    marginTop: spacing.xl,
  },
});
