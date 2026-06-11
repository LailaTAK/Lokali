// mobile/app/(loueur)/dashboard.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { useReservationsStore } from '../../src/stores/reservations.store';
import { useBiensStore } from '../../src/stores/biens.store';
import { KpiCard } from '../../src/components/KpiCard';
import { RevenueChart } from '../../src/components/RevenueChart';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/spacing';
import { client } from '../../src/api/client';
import { ENDPOINTS } from '../../src/constants/api';

/**
 * Host Dashboard Screen.
 * Summarizes KPI counters, revenue charts, incoming alerts, and details the 5 latest bookings.
 */
export default function LoueurDashboard() {
  const currentUser = useAuthStore((state) => state.user);
  const { logout } = useAuthStore();
  const { reservations, fetchReservations } = useReservationsStore();
  const { fetchBiens, biens } = useBiensStore();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingReservations: 0,
    occupancyRate: 75,
    averageRating: 4.8,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch user dashboard stats from backend
      if (currentUser?.id) {
        const statsRes = await client.get(ENDPOINTS.users.stats(currentUser.id));
        const backendStats = statsRes.data.stats;
        
        setStats({
          totalRevenue: backendStats.totalRevenue || 0,
          pendingReservations: backendStats.reservationsCount || 0, // proxy for demo
          occupancyRate: 78, // simulated percentage
          averageRating: backendStats.averageRating || 0,
        });
      }

      // 2. Load latest bookings and properties
      await fetchReservations(true);
      await fetchBiens(true);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  // Get the 5 latest bookings
  const latestBookings = reservations.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bonjour,</Text>
          <Text style={styles.nameText}>{currentUser?.prenom} {currentUser?.nom}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn} hitSlop={15}>
          <Ionicons name="log-out-outline" size={24} color={colors.light.error} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Urgent alert banners */}
        {stats.pendingReservations > 0 && (
          <Pressable
            onPress={() => router.push('/reservations')}
            style={styles.alertBanner}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.palette.white} />
            <Text style={styles.alertBannerText}>
              Vous avez {stats.pendingReservations} demande(s) de réservation en attente d'approbation !
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.palette.white} />
          </Pressable>
        )}

        {/* Grid KPI cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <KpiCard
              titre="Revenus"
              valeur={stats.totalRevenue}
              unite="€"
              variation={12.4}
              iconName="cash-outline"
              color={colors.light.success}
            />
            <KpiCard
              titre="En attente"
              valeur={stats.pendingReservations}
              iconName="hourglass-outline"
              color={colors.light.warning}
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              titre="Taux Occ."
              valeur={stats.occupancyRate}
              unite="%"
              variation={2.8}
              iconName="calendar-outline"
              color={colors.light.primary}
            />
            <KpiCard
              titre="Note"
              valeur={stats.averageRating}
              variation={0.5}
              iconName="star-outline"
              color={colors.light.accent}
            />
          </View>
        </View>

        {/* Revenue interactive chart */}
        <RevenueChart />

        {/* Property Listing management shortcuts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes propriétés ({biens.length})</Text>
          <Pressable onPress={() => router.push('/biens')}>
            <Text style={styles.sectionLink}>Gérer</Text>
          </Pressable>
        </View>

        {/* 5 Latest Bookings List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dernières réservations</Text>
          <Pressable onPress={() => router.push('/reservations')}>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </Pressable>
        </View>

        {latestBookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune réservation enregistrée.</Text>
          </Card>
        ) : (
          latestBookings.map((res) => (
            <Card
              key={res.id}
              style={styles.bookingCard}
              onPress={() => router.push({ pathname: '/reservations', params: { id: res.id } })}
            >
              <View style={styles.bookingCardHeader}>
                <View>
                  <Text style={styles.clientName}>
                    {res.client?.prenom} {res.client?.nom}
                  </Text>
                  <Text style={styles.bookingDate}>
                    Du {new Date(res.checkIn).toLocaleDateString('fr-FR')} au {new Date(res.checkOut).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <Badge status={res.statut} />
              </View>
              <View style={styles.bookingCardFooter}>
                <Text style={styles.bienTitle} numberOfLines={1}>
                  {res.bien?.titre}
                </Text>
                <Text style={styles.amountText}>
                  {res.montantTotal} €
                </Text>
              </View>
            </Card>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  welcomeText: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    fontWeight: fontWeight.semibold,
  },
  nameText: {
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.error,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  alertBannerText: {
    flex: 1,
    color: colors.palette.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginHorizontal: spacing.sm,
  },
  kpiGrid: {
    marginBottom: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  sectionLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
  },
  bookingCard: {
    marginBottom: spacing.sm,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientName: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  bookingDate: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  bookingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  bienTitle: {
    fontSize: fontSize.sm,
    color: colors.palette.gray[600],
    flex: 0.75,
  },
  amountText: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
  },
});

// FICHIER SUIVANT : mobile/app/(loueur)/biens/index.tsx
