// mobile/app/(admin)/stats.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../src/constants/spacing';
import { KpiCard } from '../../src/components/KpiCard';
import { Card } from '../../src/components/Card';
import { Avatar } from '../../src/components/Avatar';
import { useAuthStore } from '../../src/stores/auth.store';
import { client } from '../../src/api/client';

interface TopHost {
  id: string;
  nom: string;
  prenom: string;
  photoUrl: string | null;
  biensCount: number;
  totalRevenue: number;
}

/**
 * Admin Statistics Dashboard Screen.
 * Summarizes global platform metrics, signup/booking trends, and charts top performing hosts.
 */
export default function AdminStatsScreen() {
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // KPI Metrics
  const [metrics, setMetrics] = useState({
    totalUsers: 1450,
    totalBiens: 320,
    totalBookings: 840,
    totalRevenue: 245000,
  });

  // Top Hosts list
  const [topHosts, setTopHosts] = useState<TopHost[]>([
    { id: '1', nom: 'Sow', prenom: 'Awa', photoUrl: null, biensCount: 8, totalRevenue: 18400 },
    { id: '2', nom: 'Ndiaye', prenom: 'Moussa', photoUrl: null, biensCount: 6, totalRevenue: 14200 },
    { id: '3', nom: 'Diop', prenom: 'Khadim', photoUrl: null, biensCount: 5, totalRevenue: 11900 },
    { id: '4', nom: 'Gueye', prenom: 'Fatou', photoUrl: null, biensCount: 4, totalRevenue: 9800 },
  ]);

  useEffect(() => {
    // Simulate loading details
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.roleLabel}>ADMINISTRATION</Text>
          <Text style={styles.headerTitle}>Tableau de bord</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn} hitSlop={15}>
          <Ionicons name="log-out-outline" size={24} color={colors.light.error} />
        </Pressable>
      </View>

      {/* Tabs navigation shortcuts */}
      <View style={styles.navShortcutsRow}>
        <Pressable
          onPress={() => router.push('/(admin)/annonces')}
          style={[styles.shortcutBtn, shadows.sm]}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.light.primary} />
          <Text style={styles.shortcutText}>Modération</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/utilisateurs')}
          style={[styles.shortcutBtn, shadows.sm, { marginLeft: spacing.sm }]}
        >
          <Ionicons name="people-outline" size={20} color={colors.light.primary} />
          <Text style={styles.shortcutText}>Utilisateurs</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Global KPIs cards */}
        <Text style={styles.sectionTitle}>Indicateurs globaux</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <KpiCard
              titre="Utilisateurs"
              valeur={metrics.totalUsers}
              variation={8.4}
              iconName="people-outline"
              color={colors.light.primary}
            />
            <KpiCard
              titre="Biens créés"
              valeur={metrics.totalBiens}
              variation={4.2}
              iconName="home-outline"
              color={colors.light.secondary}
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              titre="Réservations"
              valeur={metrics.totalBookings}
              variation={11.1}
              iconName="calendar-outline"
              color={colors.light.accent}
            />
            <KpiCard
              titre="Volume d'affaires"
              valeur={metrics.totalRevenue}
              unite="€"
              variation={15.3}
              iconName="cash-outline"
              color={colors.light.success}
            />
          </View>
        </View>

        {/* Top Hosts Table List */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Top Loueurs (Revenus)</Text>
        {topHosts.map((host, index) => (
          <Card key={host.id} style={styles.hostCard} shadow={true}>
            <View style={styles.hostCardContent}>
              <Text style={styles.rankText}>#{index + 1}</Text>
              
              <Avatar
                uri={host.photoUrl}
                nom={host.nom}
                prenom={host.prenom}
                size="sm"
                style={styles.hostAvatar}
              />
              
              <View style={styles.hostTextContainer}>
                <Text style={styles.hostName}>
                  {host.prenom} {host.nom}
                </Text>
                <Text style={styles.hostMeta}>
                  {host.biensCount} biens enregistrés
                </Text>
              </View>

              <View style={styles.revenueContainer}>
                <Text style={styles.revenueVal}>
                  {host.totalRevenue.toLocaleString('fr-FR')} €
                </Text>
              </View>
            </View>
          </Card>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.border,
  },
  roleLabel: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.heavy,
    color: colors.light.error,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: fontSize.md + 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginTop: 2,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  navShortcutsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.background,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  shortcutText: {
    fontSize: fontSize.xs + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginLeft: spacing.xs,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.md,
  },
  kpiGrid: {
    marginBottom: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hostCard: {
    marginBottom: spacing.sm,
  },
  hostCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
    color: colors.light.primary,
    width: 30,
  },
  hostAvatar: {
    marginRight: spacing.sm,
  },
  hostTextContainer: {
    flex: 1,
  },
  hostName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  hostMeta: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  revenueContainer: {
    alignItems: 'flex-end',
  },
  revenueVal: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.success,
  },
});

// FICHIER SUIVANT : mobile/app/(admin)/annonces.tsx
