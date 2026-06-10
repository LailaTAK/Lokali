// mobile/src/components/Badge.tsx

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/spacing';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps {
  label?: string;
  variant?: BadgeVariant;
  status?: string; // Optional direct Lokali status string to auto-map variant
  style?: ViewStyle;
}

// Map Lokali statuses to Badge variants
const statusVariantMap: Record<string, BadgeVariant> = {
  // ReservationStatut
  EN_ATTENTE: 'warning',
  CONFIRMEE: 'success',
  ANNULEE: 'error',
  TERMINEE: 'neutral',

  // AnnonceStatut
  ACTIF: 'success',
  REJETEE: 'error',
  ARCHIVE: 'neutral',

  // BienStatut
  DISPONIBLE: 'success',
  EN_TRAVAUX: 'warning',
  INDISPONIBLE: 'neutral',

  // PaiementStatut
  PAYE: 'success',
  REMBOURSE: 'info',
};

// Map status labels to pretty display text
const statusLabelMap: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONFIRMEE: 'Confirmée',
  ANNULEE: 'Annulée',
  TERMINEE: 'Terminée',
  ACTIF: 'Active',
  REJETEE: 'Rejetée',
  ARCHIVE: 'Archivée',
  DISPONIBLE: 'Disponible',
  EN_TRAVAUX: 'En travaux',
  INDISPONIBLE: 'Indisponible',
  PAYE: 'Payé',
  REMBOURSE: 'Remboursé',
};

/**
 * Custom color status indicator badge. Maps database enum types
 * (e.g. Reservation, Listing validation statuses) to custom labels and theme backgrounds.
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  variant,
  status,
  style,
}) => {
  // Resolve variant from direct parameter or status mapper
  const resolvedVariant: BadgeVariant =
    variant || (status && statusVariantMap[status]) || 'neutral';

  // Resolve text label from explicit label prop, or map status, or fallback
  const resolvedLabel =
    label || (status && statusLabelMap[status]) || status || 'Inconnu';

  const getVariantStyles = (): { badge: ViewStyle; text: TextStyle } => {
    switch (resolvedVariant) {
      case 'success':
        return {
          badge: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
          text: { color: colors.light.success },
        };
      case 'warning':
        return {
          badge: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
          text: { color: colors.light.warning },
        };
      case 'error':
        return {
          badge: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
          text: { color: colors.light.error },
        };
      case 'info':
        return {
          badge: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
          text: { color: colors.light.info },
        };
      case 'neutral':
      default:
        return {
          badge: { backgroundColor: 'rgba(107, 114, 128, 0.12)' },
          text: { color: colors.palette.gray[500] },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.container, variantStyles.badge, style]}>
      <Text style={[styles.text, variantStyles.text]}>{resolvedLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// FICHIER SUIVANT : mobile/src/components/Avatar.tsx
