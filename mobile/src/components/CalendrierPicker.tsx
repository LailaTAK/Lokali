// mobile/src/components/CalendrierPicker.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/spacing';

export interface CalendrierPickerProps {
  prixParNuit: number;
  reservationsExistantes?: { debut: string; fin: string }[];
  onSelectDates: (dates: { checkIn: Date; checkOut: Date; nbNuits: number; montantTotal: number } | null) => void;
}

/**
 * Lightweight, zero-dependency calendar range picker.
 * Supports date range selection, disabled reserved days, dynamic nights/totals display, and min/max limits.
 */
export const CalendrierPicker: React.FC<CalendrierPickerProps> = ({
  prixParNuit,
  reservationsExistantes = [],
  onSelectDates,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust JS day (Sunday = 0) to Monday start (Monday = 0)
  const adjustedStartDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Create array of days in month
  const daysArray: (Date | null)[] = [];
  for (let i = 0; i < adjustedStartDay; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    daysArray.push(new Date(year, month, d));
  }

  // Pre-calculate set of disabled timestamps
  const disabledTimestamps = new Set<number>();
  reservationsExistantes.forEach((res) => {
    const start = new Date(res.debut);
    const end = new Date(res.fin);
    // Include all days inside the reservation range
    const loop = new Date(start);
    while (loop <= end) {
      disabledTimestamps.add(new Date(loop.getFullYear(), loop.getMonth(), loop.getDate()).getTime());
      loop.setDate(loop.getDate() + 1);
    }
  });

  // Navigate months
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Click handler
  const handleSelectDay = (day: Date) => {
    const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();

    // Block past dates
    const today = new Date();
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (dayTime < todayTime) return;

    // Block disabled reserved dates
    if (disabledTimestamps.has(dayTime)) {
      setErrorMsg('Cette date est déjà réservée.');
      return;
    }

    setErrorMsg(null);

    if (!startDate || (startDate && endDate)) {
      // First select or reset
      setStartDate(day);
      setEndDate(null);
      onSelectDates(null);
    } else {
      // Second select (endDate)
      if (dayTime < startDate.getTime()) {
        // Clicked day is before start date, reset start date
        setStartDate(day);
      } else if (dayTime === startDate.getTime()) {
        // Can't book 0 nights
        return;
      } else {
        // Verify no overlapping bookings in selected range
        let hasConflict = false;
        const testDate = new Date(startDate);
        while (testDate <= day) {
          const testTime = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate()).getTime();
          if (disabledTimestamps.has(testTime)) {
            hasConflict = true;
            break;
          }
          testDate.setDate(testDate.getDate() + 1);
        }

        if (hasConflict) {
          setErrorMsg('La plage sélectionnée comporte des jours déjà réservés.');
          return;
        }

        // Compute night duration count
        const diffTime = Math.abs(day.getTime() - startDate.getTime());
        const nbNuits = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (nbNuits > 90) {
          setErrorMsg('La durée de réservation maximale est de 90 nuits.');
          return;
        }

        setEndDate(day);
        onSelectDates({
          checkIn: startDate,
          checkOut: day,
          nbNuits,
          montantTotal: nbNuits * prixParNuit,
        });
      }
    }
  };

  // Helpers to check status
  const isSelected = (day: Date) => {
    const dayTime = day.getTime();
    if (startDate && dayTime === startDate.getTime()) return true;
    if (endDate && dayTime === endDate.getTime()) return true;
    return false;
  };

  const isInRange = (day: Date) => {
    if (!startDate || !endDate) return false;
    const dayTime = day.getTime();
    return dayTime > startDate.getTime() && dayTime < endDate.getTime();
  };

  const isDayDisabled = (day: Date) => {
    const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const today = new Date();
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return dayTime < todayTime || disabledTimestamps.has(dayTime);
  };

  // Render header values
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <View style={[styles.container, shadows.sm]}>
      {/* Month Navigator Header */}
      <View style={styles.header}>
        <Pressable onPress={prevMonth} hitSlop={15} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {monthNames[month]} {year}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={15} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.light.text} />
        </Pressable>
      </View>

      {/* Week day letters header */}
      <View style={styles.weekHeader}>
        {weekDays.map((wd) => (
          <Text key={wd} style={styles.weekDayText}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {daysArray.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
          }

          const selected = isSelected(day);
          const range = isInRange(day);
          const disabled = isDayDisabled(day);

          return (
            <Pressable
              key={`day-${day.getDate()}`}
              disabled={disabled}
              onPress={() => handleSelectDay(day)}
              style={[
                styles.dayCell,
                selected && styles.dayCellSelected,
                range && styles.dayCellInRange,
                disabled && styles.dayCellDisabled,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  selected && styles.dayTextSelected,
                  disabled && styles.dayTextDisabled,
                ]}
              >
                {day.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Error Messaging block */}
      {errorMsg && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={16} color={colors.light.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Summary Footer */}
      {startDate && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Dates de séjour :</Text>
          <Text style={styles.summaryDates}>
            Du {startDate.toLocaleDateString('fr-FR')}
            {endDate ? ` au ${endDate.toLocaleDateString('fr-FR')}` : ' (sélectionner départ)'}
          </Text>

          {startDate && endDate && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceBreakdown}>
                {prixParNuit} € x {Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} nuits
              </Text>
              <Text style={styles.priceTotal}>
                Total : {(Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * prixParNuit).toLocaleString('fr-FR')} €
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.light.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  navButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.palette.gray[100],
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.palette.gray[400],
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCellEmpty: {
    width: 40,
    height: 40,
    marginVertical: 2,
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: colors.light.primary,
  },
  dayCellInRange: {
    backgroundColor: 'rgba(83, 74, 183, 0.12)',
    borderRadius: 0,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.text,
  },
  dayTextSelected: {
    color: colors.palette.white,
    fontWeight: fontWeight.bold,
  },
  dayTextDisabled: {
    textDecorationLine: 'line-through',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: {
    color: colors.light.error,
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  summaryContainer: {
    marginTop: spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: colors.light.border,
    paddingTop: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
  },
  summaryDates: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.palette.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  priceBreakdown: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
  },
  priceTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
  },
});

// FICHIER SUIVANT : mobile/src/components/RecapReservation.tsx
