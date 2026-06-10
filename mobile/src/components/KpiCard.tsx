// mobile/src/components/KpiCard.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/spacing';

export interface KpiCardProps {
  titre: string;
  valeur: number;
  unite?: string;
  variation?: number; // e.g. +12.5% or -3.2%
  iconName: string;
  color?: string;
}

/**
 * Host stats KPI card component.
 * Features variations trend banners, customizable icons, and rolling counting animation on mount.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  titre,
  valeur,
  unite = '',
  variation,
  iconName,
  color = colors.light.primary,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const counterAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Setup counting listener
    const listenerId = counterAnim.addListener((state) => {
      // Handle formatting dynamically
      setDisplayValue(Number(state.value.toFixed(0)));
    });

    // 2. Run counting and mount entrance animations
    Animated.parallel([
      Animated.timing(counterAnim, {
        toValue: valeur,
        duration: 1200,
        useNativeDriver: false, // listener trigger requires false
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      counterAnim.removeListener(listenerId);
    };
  }, [valeur]);

  // Handle variation styling
  const isPositive = variation !== undefined && variation >= 0;
  const variationText = variation !== undefined
    ? `${isPositive ? '+' : ''}${variation.toFixed(1)}%`
    : '';

  return (
    <Animated.View
      style={[
        styles.container,
        shadows.sm,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Icon & Title row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrapper, { backgroundColor: `${color}18` }]}>
          <Ionicons name={iconName as any} size={20} color={color} />
        </View>
        {variation !== undefined && (
          <View
            style={[
              styles.variationBadge,
              {
                backgroundColor: isPositive
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
              },
            ]}
          >
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={isPositive ? colors.light.success : colors.light.error}
              style={styles.trendIcon}
            />
            <Text
              style={[
                styles.variationText,
                { color: isPositive ? colors.light.success : colors.light.error },
              ]}
            >
              {variationText}
            </Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.titleText}>{titre}</Text>

      {/* Value counter */}
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>
          {displayValue.toLocaleString('fr-FR')}
          {unite && <Text style={styles.unitText}> {unite}</Text>}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    flex: 1,
    minWidth: 140,
    margin: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  variationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  trendIcon: {
    marginRight: 3,
  },
  variationText: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
  },
  titleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueText: {
    fontSize: fontSize.xxl - 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  unitText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.textMuted,
  },
});

// FICHIER SUIVANT : mobile/src/components/RevenueChart.tsx
