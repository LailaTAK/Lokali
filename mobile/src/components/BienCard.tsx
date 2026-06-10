// mobile/src/components/BienCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/spacing';
import { Card } from './Card';
import { Badge } from './Badge';

export interface BienCardProps {
  photo?: string | null;
  titre: string;
  ville: string;
  loyer: number;
  type: string;
  note?: number;
  statut?: string;
  loading?: boolean;
  onPress?: () => void;
}

/**
 * Property list item card component.
 * Features remote image loaders, rating average labels, status badges, and skeleton placeholder layout.
 */
export const BienCard: React.FC<BienCardProps> = ({
  photo,
  titre,
  ville,
  loyer,
  type,
  note = 0,
  statut,
  loading = false,
  onPress,
}) => {
  if (loading) {
    return (
      <View style={[styles.skeletonCard, shadows.sm]}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonLineLong} />
          <View style={styles.skeletonFooter}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineShort} />
          </View>
        </View>
      </View>
    );
  }

  // Fallback image url if none provided
  const imageUrl = photo || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80';

  return (
    <Card padding={0} radius="lg" shadow={true} style={styles.cardContainer} onPress={onPress}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        {statut && (
          <Badge status={statut} style={styles.badgeOverlay} />
        )}
      </View>

      <View style={styles.detailsContainer}>
        {/* Type & Rating row */}
        <View style={styles.metaRow}>
          <Text style={styles.typeText}>{type}</Text>
          {note > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{note.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.titleText} numberOfLines={2}>
          {titre}
        </Text>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.palette.gray[500]} />
          <Text style={styles.locationText}>{ville}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>
            {loyer.toLocaleString('fr-FR')} €
            <Text style={styles.priceLabel}> / mois</Text>
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
    height: 180,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    ...shadows.sm,
  },
  detailsContainer: {
    padding: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginLeft: 3,
  },
  titleText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
  },
  priceLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    color: colors.light.textMuted,
  },

  // SKELETON LOADING STYLES
  skeletonCard: {
    height: 290,
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  skeletonImage: {
    height: 180,
    backgroundColor: colors.palette.gray[200],
  },
  skeletonContent: {
    padding: spacing.md,
    flex: 1,
    justifyContent: 'space-between',
  },
  skeletonLineShort: {
    width: '30%',
    height: 12,
    backgroundColor: colors.palette.gray[200],
    borderRadius: borderRadius.xs,
  },
  skeletonLineLong: {
    width: '85%',
    height: 16,
    backgroundColor: colors.palette.gray[200],
    borderRadius: borderRadius.xs,
    marginVertical: spacing.xs,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});

// FICHIER SUIVANT : mobile/src/components/BienGalerie.tsx
