// mobile/app/(client)/historique.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useReservationsStore } from '../../src/stores/reservations.store';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../src/constants/spacing';
import { Reservation } from '../../src/types/models';

type TabType = 'AVENIR' | 'EN_COURS' | 'PASSE' | 'ANNULE';

/**
 * Guest Bookings History Screen.
 * Lists user reservations under tab segments (Upcoming, Active, Past, Cancelled)
 * with pull-to-refresh loading and context actions.
 */
export default function HistoriqueScreen() {
  const {
    reservations,
    isLoading,
    fetchReservations,
    cancelReservation,
  } = useReservationsStore();

  const [activeTab, setActiveTab] = useState<TabType>('AVENIR');

  const reloadData = useCallback(async () => {
    try {
      await fetchReservations(true);
    } catch (err) {
      console.error('Failed to load reservations history:', err);
    }
  }, [fetchReservations]);

  useEffect(() => {
    reloadData();
  }, []);

  // Filter reservations based on activeTab
  const getFilteredReservations = (): Reservation[] => {
    const now = new Date().getTime();

    return reservations.filter((res) => {
      const start = new Date(res.checkIn).getTime();
      const end = new Date(res.checkOut).getTime();
      
      switch (activeTab) {
        case 'EN_COURS':
          return res.statut === 'CONFIRMEE' && start <= now && end >= now;
        case 'PASSE':
          return (res.statut === 'TERMINEE' || (res.statut === 'CONFIRMEE' && end < now));
        case 'ANNULE':
          return res.statut === 'ANNULEE';
        case 'AVENIR':
        default:
          // Include confirmed future bookings or pending approvals
          return (res.statut === 'EN_ATTENTE' || (res.statut === 'CONFIRMEE' && start > now));
      }
    });
  };

  const handleCancelPress = (resId: string) => {
    Alert.alert(
      'Annuler la réservation',
      'Êtes-vous sûr de vouloir annuler cette demande de réservation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservation(resId);
              Alert.alert('Annulation réussie', 'La réservation a été annulée.');
              reloadData();
            } catch (err: any) {
              const errMsg = err.response?.data?.message || 'Erreur lors de l\'annulation.';
              Alert.alert('Impossible d\'annuler', errMsg);
            }
          },
        },
      ]
    );
  };

  const filteredData = getFilteredReservations();

  return (
    <SafeAreaView style={styles.container}>
      {/* Title Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Mes réservations</Text>
      </View>

      {/* Tabs segments */}
      <View style={styles.tabsContainer}>
        {(['AVENIR', 'EN_COURS', 'PASSE', 'ANNULE'] as TabType[]).map((tab) => {
          const isSelected = activeTab === tab;
          const labelMap: Record<TabType, string> = {
            AVENIR: 'À venir',
            EN_COURS: 'En cours',
            PASSE: 'Passées',
            ANNULE: 'Annulées',
          };
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                {labelMap[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={reloadData}
        refreshing={isLoading && reservations.length > 0}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.palette.gray[300]} />
              <Text style={styles.emptyText}>Aucune réservation dans cette catégorie.</Text>
            </View>
          ) : (
            <ActivityIndicator size="small" color={colors.light.primary} style={{ marginTop: 40 }} />
          )
        }
        renderItem={({ item }) => {
          // Check payment status
          const isPaid = item.paiements && item.paiements.some((p) => p.statut === 'PAYE');
          const isPendingApproval = item.statut === 'EN_ATTENTE';
          const isConfirmedUnpaid = item.statut === 'CONFIRMEE' && !isPaid;

          return (
            <Card style={styles.reservationCard} shadow={true}>
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View>
                  <Text numberOfLines={1} style={styles.titleText}>
                    {item.bien?.titre || 'Logement Lokali'}
                  </Text>
                  <Text style={styles.cityText}>{item.bien?.ville}</Text>
                </View>
                <Badge status={item.statut} />
              </View>

              <View style={styles.divider} />

              {/* Booking dates info */}
              <View style={styles.dateInfoRow}>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateLabel}>ARRIVÉE</Text>
                  <Text style={styles.dateValue}>
                    {new Date(item.checkIn).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateLabel}>DÉPART</Text>
                  <Text style={styles.dateValue}>
                    {new Date(item.checkOut).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.durationBlock}>
                  <Text style={styles.durationLabel}>NUITS</Text>
                  <Text style={styles.durationValue}>{item.nbNuits}</Text>
                </View>
              </View>

              {/* Price & payment info */}
              <View style={styles.pricingRow}>
                <Text style={styles.totalPriceLabel}>Total séjour :</Text>
                <View style={styles.totalPriceWrapper}>
                  <Text style={styles.totalPriceVal}>
                    {item.montantTotal.toLocaleString('fr-FR')} €
                  </Text>
                  <Text style={[styles.paymentStatusText, isPaid ? styles.paidText : styles.unpaidText]}>
                    ({isPaid ? 'Payé' : 'Non réglé'})
                  </Text>
                </View>
              </View>

              {/* Card Contextual Action button */}
              {(isConfirmedUnpaid || isPendingApproval) && (
                <View style={styles.actionsContainer}>
                  {isConfirmedUnpaid && (
                    <Button
                      label="Régler le paiement"
                      onPress={() =>
                        router.push({
                          pathname: '/(client)/paiement',
                          params: { id: item.id },
                        })
                      }
                      style={styles.actionBtn}
                      size="sm"
                    />
                  )}
                  {isPendingApproval && (
                    <Button
                      label="Annuler la demande"
                      onPress={() => handleCancelPress(item.id)}
                      variant="outline"
                      style={styles.actionBtn}
                      size="sm"
                    />
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  headerBar: {
    paddingHorizontal: spacing.md,
    height: 52,
    justifyContent: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  headerTitle: {
    fontSize: fontSize.md + 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    borderColor: colors.light.primary,
  },
  tabText: {
    fontSize: fontSize.xs + 1,
    fontWeight: fontWeight.semibold,
    color: colors.light.textMuted,
  },
  tabTextActive: {
    color: colors.light.primary,
    fontWeight: fontWeight.bold,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  reservationCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleText: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    maxWidth: 200,
  },
  cityText: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: spacing.md,
  },
  dateInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dateBlock: {
    flex: 0.4,
  },
  durationBlock: {
    flex: 0.2,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
    color: colors.palette.gray[400],
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginTop: 2,
  },
  durationLabel: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
    color: colors.palette.gray[400],
    letterSpacing: 0.5,
  },
  durationValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginTop: 2,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPriceLabel: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    fontWeight: fontWeight.semibold,
  },
  totalPriceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalPriceVal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  paymentStatusText: {
    fontSize: fontSize.xs,
    marginLeft: 4,
    fontWeight: fontWeight.semibold,
  },
  paidText: {
    color: colors.light.success,
  },
  unpaidText: {
    color: colors.light.warning,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  actionBtn: {
    alignSelf: 'auto',
  },
});

// FICHIER SUIVANT : mobile/app/(client)/messages.tsx
