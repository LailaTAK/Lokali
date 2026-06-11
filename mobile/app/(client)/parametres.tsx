// mobile/app/(client)/parametres.tsx

import React from 'react';
import {
  Alert,
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
import { colors } from '../../src/constants/colors';
import { borderRadius, fontSize, fontWeight, spacing } from '../../src/constants/spacing';
import { useAuthStore } from '../../src/stores/auth.store';
import { UserRole } from '../../src/types/models';

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Client',
  LOUEUR: 'Loueur',
  ADMINISTRATEUR: 'Administrateur',
};

function formatDate(value?: string | null): string {
  if (!value) return 'Non renseigné';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Non renseigné';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.light.primary} />
      </View>
      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ParametresScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment quitter votre session Lokali ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={15}>
            <Ionicons name="arrow-back" size={24} color={colors.light.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Paramètres</Text>
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
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres</Text>
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
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.light.primary} />
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Informations personnelles</Text>
        <Card padding="lg" radius="lg" style={styles.infoCard}>
          <InfoRow icon="mail-outline" label="Adresse e-mail" value={user.email} />
          <View style={styles.rowDivider} />
          <InfoRow icon="call-outline" label="Téléphone" value={user.telephone || 'Non renseigné'} />
          <View style={styles.rowDivider} />
          <InfoRow icon="location-outline" label="Adresse" value={user.adresse || 'Non renseignée'} />
          <View style={styles.rowDivider} />
          <InfoRow
            icon={user.actif ? 'checkmark-circle-outline' : 'pause-circle-outline'}
            label="Statut du compte"
            value={user.actif ? 'Compte actif' : 'Compte inactif'}
          />
          <View style={styles.rowDivider} />
          <InfoRow icon="calendar-outline" label="Membre depuis" value={formatDate(user.createdAt)} />
        </Card>

        <Text style={styles.sectionLabel}>Session</Text>
        <Card padding="lg" radius="lg" style={styles.sessionCard}>
          <View style={styles.sessionTextBlock}>
            <Text style={styles.sessionTitle}>Compte connecté</Text>
            <Text style={styles.sessionSubtitle}>
              La déconnexion supprimera les jetons locaux et vous ramènera à l'écran de connexion.
            </Text>
          </View>
          <Button
            label="Se déconnecter"
            variant="danger"
            fullWidth
            loading={isLoading}
            disabled={isLoading}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.palette.white} />}
            onPress={handleLogout}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
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
    letterSpacing: 0.6,
  },
  infoCard: {
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.palette.gray[100],
  },
  infoTextBlock: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.light.textMuted,
  },
  infoValue: {
    marginTop: 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: spacing.sm,
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
