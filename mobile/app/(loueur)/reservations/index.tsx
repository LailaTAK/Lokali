// mobile/app/(loueur)/reservations/index.tsx

import React, { useState, useEffect } from 'react';
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
import { useReservationsStore } from '../../../src/stores/reservations.store';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Avatar } from '../../../src/components/Avatar';
import { colors } from '../../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../../src/constants/spacing';
import { Reservation } from '../../../src/types/models';

type ViewMode = 'LIST' | 'CALENDAR';
type FilterStatus = 'ALL' | 'EN_ATTENTE' | 'CONFIRMEE' | 'HISTORIQUE';

/**
 * Host Reservations Management Screen.
 * Renders lists of bookings with Accept/Reject quick actions, and includes
 * an interactive occupancy calendar view.
 */
export default function ReservationsIndexScreen() {
  const {
    reservations,
    calendrierHost,
    isLoading,
    fetchReservations,
    confirmReservation,
    cancelReservation,
    fetchCalendrierHost,
  } = useReservationsStore();

  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('EN_ATTENTE');
  const [currentDate, setCurrentDate] = useState(new Date());

  const reloadData = async () => {
    try {
      await fetchReservations(true);
      await fetchCalendrierHost();
    } catch (err) {
      console.error('Failed to load host bookings:', err);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleAccept = (resId: string) => {
    Alert.alert(
      'Accepter la réservation',
      'Voulez-vous valider cette demande de séjour ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, confirmer',
          onPress: async () => {
            try {
              await confirmReservation(resId);
              Alert.alert('Succès', 'La réservation a été confirmée !');
              reloadData();
            } catch (err: any) {
              Alert.alert('Erreur', 'Impossible de valider la réservation.');
            }
          },
        },
      ]
    );
  };

  const handleReject = (resId: string) => {
    Alert.alert(
      'Refuser la réservation',
      'Êtes-vous sûr de vouloir refuser et annuler cette demande de séjour ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservation(resId);
              Alert.alert('Succès', 'La demande a été rejetée.');
              reloadData();
            } catch (err: any) {
              Alert.alert('Erreur', 'Impossible de rejeter la réservation.');
            }
          },
        },
      ]
    );
  };

  // Filter List results
  const getFilteredBookings = (): Reservation[] => {
    return reservations.filter((res) => {
      switch (filterStatus) {
        case 'EN_ATTENTE':
          return res.statut === 'EN_ATTENTE';
        case 'CONFIRMEE':
          return res.statut === 'CONFIRMEE';
        case 'HISTORIQUE':
          return res.statut === 'ANNULEE' || res.statut === 'TERMINEE';
        case 'ALL':
        default:
          return true;
      }
    });
  };

  const filteredBookings = getFilteredBookings();

  // --- CALENDAR RENDER HELPERS ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid: (Date | null)[] = [];
  for (let i = 0; i < adjustedFirstDay; i++) daysGrid.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysGrid.push(new Date(year, month, d));

  // Pre-calculate set of booked dates for calendar highlight
  const bookedDatesMap = new Map<number, Reservation>();
  calendrierHost.forEach((res) => {
    const start = new Date(res.checkIn);
    const end = new Date(res.checkOut);
    const loop = new Date(start);
    while (loop <= end) {
      const loopTime = new Date(loop.getFullYear(), loop.getMonth(), loop.getDate()).getTime();
      bookedDatesMap.set(loopTime, res);
      loop.setDate(loop.getDate() + 1);
    }
  });

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Réservations Reçues</Text>
        <View style={styles.viewModeToggleRow}>
          <Pressable
            onPress={() => setViewMode('LIST')}
            style={[styles.toggleIconBtn, viewMode === 'LIST' && styles.toggleIconBtnActive]}
          >
            <Ionicons name="list" size={18} color={viewMode === 'LIST' ? colors.light.primary : colors.light.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => setViewMode('CALENDAR')}
            style={[styles.toggleIconBtn, viewMode === 'CALENDAR' && styles.toggleIconBtnActive]}
          >
            <Ionicons name="calendar" size={18} color={viewMode === 'CALENDAR' ? colors.light.primary : colors.light.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* --- LIST VIEW BODY --- */}
      {viewMode === 'LIST' && (
        <View style={{ flex: 1 }}>
          {/* Status Tabs */}
          <View style={styles.tabsContainer}>
            {(['EN_ATTENTE', 'CONFIRMEE', 'HISTORIQUE', 'ALL'] as FilterStatus[]).map((tab) => {
              const isSelected = filterStatus === tab;
              const labelMap: Record<FilterStatus, string> = {
                EN_ATTENTE: 'À valider',
                CONFIRMEE: 'Confirmées',
                HISTORIQUE: 'Historique',
                ALL: 'Tout',
              };
              return (
                <Pressable
                  key={tab}
                  onPress={() => setFilterStatus(tab)}
                  style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                    {labelMap[tab]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onRefresh={reloadData}
            refreshing={isLoading && reservations.length > 0}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={colors.palette.gray[300]} />
                  <Text style={styles.emptyText}>Aucune réservation reçue.</Text>
                </View>
              ) : (
                <ActivityIndicator size="small" color={colors.light.primary} style={{ marginTop: 40 }} />
              )
            }
            renderItem={({ item }) => {
              const isPending = item.statut === 'EN_ATTENTE';
              const checkInStr = new Date(item.checkIn).toLocaleDateString('fr-FR');
              const checkOutStr = new Date(item.checkOut).toLocaleDateString('fr-FR');

              return (
                <Card style={styles.bookingCard} shadow={true}>
                  {/* Guest header info */}
                  <View style={styles.cardHeader}>
                    <Avatar
                      uri={item.client?.photoUrl}
                      nom={item.client?.nom || ''}
                      prenom={item.client?.prenom || ''}
                      size="sm"
                    />
                    <View style={styles.headerTextContainer}>
                      <Text style={styles.clientName}>
                        {item.client?.prenom} {item.client?.nom}
                      </Text>
                      <Text style={styles.propertyTitle} numberOfLines={1}>
                        {item.bien?.titre}
                      </Text>
                    </View>
                    <Badge status={item.statut} />
                  </View>

                  <View style={styles.divider} />

                  {/* Booking parameters */}
                  <View style={styles.bookingDetailsRow}>
                    <View>
                      <Text style={styles.infoLabel}>SÉJOUR</Text>
                      <Text style={styles.infoVal}>
                        Du {checkInStr} au {checkOutStr} ({item.nbNuits} nuits)
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.infoLabel}>MONTANT</Text>
                      <Text style={styles.amountValText}>{item.montantTotal} €</Text>
                    </View>
                  </View>

                  {item.message && (
                    <View style={styles.messageBlock}>
                      <Text style={styles.messageLabel}>Message du client :</Text>
                      <Text style={styles.messageText}>"{item.message}"</Text>
                    </View>
                  )}

                  {/* Accept/Reject Pending CTA */}
                  {isPending && (
                    <View style={styles.actionBtnRow}>
                      <Button
                        label="Refuser"
                        onPress={() => handleReject(item.id)}
                        variant="outline"
                        style={styles.cancelBtn}
                        size="sm"
                      />
                      <Button
                        label="Accepter"
                        onPress={() => handleAccept(item.id)}
                        variant="secondary"
                        style={styles.acceptBtn}
                        size="sm"
                      />
                    </View>
                  )}
                </Card>
              );
            }}
          />
        </View>
      )}

      {/* --- CALENDAR VIEW BODY --- */}
      {viewMode === 'CALENDAR' && (
        <View style={styles.calendarContainer}>
          {/* Calendar Header Month navigator */}
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePrevMonth} style={styles.calendarNavBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.light.text} />
            </Pressable>
            <Text style={styles.calendarMonthName}>
              {monthNames[month]} {year}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.calendarNavBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.light.text} />
            </Pressable>
          </View>

          {/* Weekday labels */}
          <View style={styles.calendarWeekRow}>
            {weekDays.map((wd, i) => (
              <Text key={`wd-${i}`} style={styles.calendarWeekLabel}>{wd}</Text>
            ))}
          </View>

          {/* Days Monthly Grid */}
          <View style={styles.calendarDaysGrid}>
            {daysGrid.map((day, i) => {
              if (!day) return <View key={`empty-${i}`} style={styles.calendarDayEmpty} />;
              
              const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
              const booking = bookedDatesMap.get(dayTime);

              return (
                <Pressable
                  key={`day-${day.getDate()}`}
                  onPress={() => {
                    if (booking) {
                      Alert.alert(
                        'Détails occupation',
                        `Logement : ${booking.bien?.titre}\nClient : ${booking.client?.prenom} ${booking.client?.nom}\nDates : Du ${new Date(booking.checkIn).toLocaleDateString('fr-FR')} au ${new Date(booking.checkOut).toLocaleDateString('fr-FR')}`
                      );
                    }
                  }}
                  style={[
                    styles.calendarDayCell,
                    booking && styles.calendarDayBooked,
                  ]}
                >
                  <Text style={[styles.calendarDayText, booking && styles.calendarDayTextBooked]}>
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendRow}>
              <View style={styles.legendDotBooked} />
              <Text style={styles.legendLabelText}>Jours occupés / Réservations confirmées</Text>
            </View>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 52,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  viewModeToggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  toggleIconBtn: {
    padding: spacing.xs,
    backgroundColor: colors.light.surface,
  },
  toggleIconBtnActive: {
    backgroundColor: 'rgba(83, 74, 183, 0.08)',
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
    fontSize: fontSize.xs,
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
  },
  bookingCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  clientName: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  propertyTitle: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
    maxWidth: 160,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: spacing.md,
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
    color: colors.palette.gray[400],
    letterSpacing: 0.5,
  },
  infoVal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginTop: 2,
  },
  amountValText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
    marginTop: 2,
  },
  messageBlock: {
    backgroundColor: colors.palette.gray[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  messageLabel: {
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
  },
  messageText: {
    fontSize: fontSize.xs + 1,
    color: colors.palette.gray[700],
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  cancelBtn: {
    marginRight: spacing.sm,
  },
  acceptBtn: {
    alignSelf: 'auto',
  },

  // CALENDAR MODE STYLES
  calendarContainer: {
    backgroundColor: colors.light.surface,
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.palette.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calendarWeekLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.palette.gray[400],
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayEmpty: {
    width: 40,
    height: 40,
    marginVertical: 2,
  },
  calendarDayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 20,
  },
  calendarDayBooked: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: colors.light.error,
  },
  calendarDayText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
  },
  calendarDayTextBooked: {
    color: colors.light.error,
    fontWeight: fontWeight.bold,
  },
  legendContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDotBooked: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.light.error,
    marginRight: spacing.sm,
  },
  legendLabelText: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    fontWeight: fontWeight.semibold,
  },
});
// FICHIER SUIVANT : mobile/app/(loueur)/messages.tsx
