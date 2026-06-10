// mobile/src/components/RevenueChart.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/spacing';

export interface ChartDataItem {
  label: string;
  value: number;
}

export type ChartPeriod = 'sem' | 'mois' | 'an';

export interface RevenueChartProps {
  weeklyData?: ChartDataItem[];
  monthlyData?: ChartDataItem[];
  yearlyData?: ChartDataItem[];
  onPeriodChange?: (period: ChartPeriod) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default Mock Datasets
const defaultWeekly = [
  { label: 'Lun', value: 120 },
  { label: 'Mar', value: 240 },
  { label: 'Mer', value: 180 },
  { label: 'Jeu', value: 310 },
  { label: 'Ven', value: 450 },
  { label: 'Sam', value: 600 },
  { label: 'Dim', value: 380 },
];

const defaultMonthly = [
  { label: 'Janv', value: 1200 },
  { label: 'Févr', value: 1800 },
  { label: 'Mars', value: 1400 },
  { label: 'Avril', value: 2200 },
  { label: 'Mai', value: 3100 },
  { label: 'Juin', value: 2800 },
];

const defaultYearly = [
  { label: '2021', value: 18000 },
  { label: '2022', value: 24000 },
  { label: '2023', value: 32000 },
  { label: '2024', value: 29000 },
  { label: '2025', value: 41000 },
  { label: '2026', value: 48000 },
];

/**
 * Custom interactive bar chart showing revenues.
 * Features toggling scales (weekly/monthly/yearly), spring bar animations, and tap tooltips.
 */
export const RevenueChart: React.FC<RevenueChartProps> = ({
  weeklyData = defaultWeekly,
  monthlyData = defaultMonthly,
  yearlyData = defaultYearly,
  onPeriodChange,
}) => {
  const [period, setPeriod] = useState<ChartPeriod>('mois');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  // Animation values for each bar slot
  const scaleAnimations = useRef<Animated.Value[]>(
    Array.from({ length: 7 }, () => new Animated.Value(0))
  ).current;

  // Resolve active dataset
  const getActiveData = (): ChartDataItem[] => {
    if (period === 'sem') return weeklyData;
    if (period === 'an') return yearlyData;
    return monthlyData;
  };

  const activeData = getActiveData();

  // Find maximum value to scale bar heights relatively
  const maxVal = Math.max(...activeData.map((d) => d.value), 100);

  // Run scale transition animation when period or data changes
  useEffect(() => {
    setSelectedBarIndex(null); // Reset tooltip
    
    // Reset heights to zero
    scaleAnimations.forEach((anim) => anim.setValue(0));

    // Staggered spring animations for all bars
    const animations = activeData.map((_, i) =>
      Animated.spring(scaleAnimations[i], {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: false, // height animations require false
      })
    );

    Animated.stagger(60, animations).start();
  }, [period, activeData]);

  const handlePeriodToggle = (selectedPeriod: ChartPeriod) => {
    setPeriod(selectedPeriod);
    onPeriodChange?.(selectedPeriod);
  };

  const handleBarTap = (index: number) => {
    setSelectedBarIndex(selectedBarIndex === index ? null : index);
  };

  return (
    <View style={[styles.container, shadows.sm]}>
      {/* Chart Header block */}
      <View style={styles.header}>
        <Text style={styles.title}>Revenus Réalisés</Text>
        
        {/* Interval Toggles */}
        <View style={styles.toggleContainer}>
          <Pressable
            onPress={() => handlePeriodToggle('sem')}
            style={[styles.toggleBtn, period === 'sem' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, period === 'sem' && styles.toggleTextActive]}>Sem</Text>
          </Pressable>
          <Pressable
            onPress={() => handlePeriodToggle('mois')}
            style={[styles.toggleBtn, period === 'mois' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, period === 'mois' && styles.toggleTextActive]}>Mois</Text>
          </Pressable>
          <Pressable
            onPress={() => handlePeriodToggle('an')}
            style={[styles.toggleBtn, period === 'an' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, period === 'an' && styles.toggleTextActive]}>An</Text>
          </Pressable>
        </View>
      </View>

      {/* Chart Canvas */}
      <View style={styles.chartCanvas}>
        {/* Tooltip Overlay */}
        {selectedBarIndex !== null && activeData[selectedBarIndex] && (
          <View
            style={[
              styles.tooltipContainer,
              shadows.md,
              {
                left: `${(selectedBarIndex / activeData.length) * 100 + 4}%`,
              },
            ]}
          >
            <Text style={styles.tooltipText}>
              {activeData[selectedBarIndex].value.toLocaleString('fr-FR')} €
            </Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}

        {/* Bars Container */}
        <View style={styles.barsContainer}>
          {activeData.map((item, index) => {
            const barHeight = scaleAnimations[index].interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${(item.value / maxVal) * 90}%`], // Leave 10% spacing at the top
            });

            const isSelected = selectedBarIndex === index;

            return (
              <View key={`bar-slot-${index}`} style={styles.barSlot}>
                <Pressable
                  onPress={() => handleBarTap(index)}
                  style={styles.barInteractiveArea}
                >
                  <Animated.View
                    style={[
                      styles.bar,
                      { height: barHeight },
                      isSelected && styles.barSelected,
                    ]}
                  />
                </Pressable>
                <Text numberOfLines={1} style={styles.barLabel}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
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
    alignSelf: 'stretch',
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.palette.gray[100],
    padding: 3,
    borderRadius: borderRadius.md,
  },
  toggleBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.light.primary,
    ...shadows.sm,
  },
  toggleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.palette.gray[500],
  },
  toggleTextActive: {
    color: colors.palette.white,
  },
  chartCanvas: {
    height: 180,
    position: 'relative',
    justifyContent: 'flex-end',
    width: '100%',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    width: '100%',
  },
  barSlot: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barInteractiveArea: {
    width: '100%',
    height: '85%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    backgroundColor: colors.light.secondary,
    borderTopLeftRadius: borderRadius.xs,
    borderTopRightRadius: borderRadius.xs,
  },
  barSelected: {
    backgroundColor: colors.light.primary,
  },
  barLabel: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },

  // TOOLTIP OVERLAYS STYLES
  tooltipContainer: {
    position: 'absolute',
    top: 0,
    backgroundColor: colors.palette.gray[900],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    zIndex: 10,
  },
  tooltipText: {
    color: colors.palette.white,
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.palette.gray[900],
    position: 'absolute',
    bottom: -4,
  },
});

// FICHIER SUIVANT : mobile/src/types/index.ts (ou conclusion)
