// mobile/app/(client)/bien/[id].tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBiens } from '../../../src/hooks/useBiens';
import { BienGalerie } from '../../../src/components/BienGalerie';
import { BienMap } from '../../../src/components/BienMap';
import { Avatar } from '../../../src/components/Avatar';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../../src/constants/spacing';

/**
 * Property Details Screen.
 * Renders full gallery slides, detailed parameters, expandable description panels,
 * host review summaries, inline location maps, and a sticky pricing checkout bar.
 */
export default function BienDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bienSelectionne, selectedBienAnnonces, selectedBienStats, fetchBienWithCache, isLoading } = useBiens();
  
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBienWithCache(id);
    }
  }, [id]);

  if (isLoading && !bienSelectionne) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (!bienSelectionne) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Ce bien n'a pas pu être chargé.</Text>
        <Button label="Retour" onPress={() => router.back()} style={styles.backBtn} />
      </View>
    );
  }

  const bien = bienSelectionne;
  const stats = selectedBienStats || { totalReservations: 0, averageRating: 0, reviewsCount: 0 };

  // Calculate pricing per night estimation for bookings
  const rawNightPrice = bien.loyer / 30;
  const nightPrice = Math.round(rawNightPrice);

  const shouldTruncateDescription = bien.description.length > 180;
  const displayedDescription =
    shouldTruncateDescription && !descriptionExpanded
      ? `${bien.description.substring(0, 180)}...`
      : bien.description;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back navigation header button */}
        <Pressable onPress={() => router.back()} style={[styles.floatingBackButton, shadows.md]}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </Pressable>

        {/* Gallery Section */}
        <BienGalerie photos={bien.photoUrls || bien.photos || []} />

        <View style={styles.contentCard}>
          {/* Main Info Header */}
          <Text style={styles.typeText}>{bien.type}</Text>
          <Text style={styles.titleText}>{bien.titre}</Text>
          
          <View style={styles.ratingLocationRow}>
            <View style={styles.ratingBlock}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingValueText}>
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'Nouveau'}
              </Text>
              {stats.reviewsCount > 0 && (
                <Text style={styles.reviewsCountText}>({stats.reviewsCount} avis)</Text>
              )}
            </View>
            <Text style={styles.bulletSeparator}>•</Text>
            <Text style={styles.locationText}>{bien.ville}</Text>
          </View>

          <View style={styles.divider} />

          {/* Key details specs icons */}
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons name="resize-outline" size={20} color={colors.light.primary} />
              <Text style={styles.specValue}>{bien.superficie} m²</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="grid-outline" size={20} color={colors.light.primary} />
              <Text style={styles.specValue}>{bien.nbPieces} pièces</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.light.primary} />
              <Text style={styles.specValue}>{bien.statut}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Host Info profile card */}
          {bien.loueur && (
            <View style={styles.hostContainer}>
              <Avatar
                uri={bien.loueur.photoUrl || bien.loueur.photo || null}
                nom={bien.loueur.nom}
                prenom={bien.loueur.prenom}
                size="md"
              />
              <View style={styles.hostTextContainer}>
                <Text style={styles.hostLabel}>HÉBERGÉ PAR</Text>
                <Text style={styles.hostName}>
                  {bien.loueur.prenom} {bien.loueur.nom}
                </Text>
                <Text style={styles.hostMeta}>Hôte vérifié Lokali</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            {displayedDescription}
          </Text>
          {shouldTruncateDescription && (
            <Pressable onPress={() => setDescriptionExpanded(!descriptionExpanded)} style={styles.expandPressable}>
              <Text style={styles.expandText}>
                {descriptionExpanded ? 'Voir moins' : 'Voir plus'}
              </Text>
              <Ionicons
                name={descriptionExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.light.primary}
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          )}

          <View style={styles.divider} />

          {/* Amenities (Equipements) */}
          {bien.equipements && bien.equipements.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Équipements du logement</Text>
              <View style={styles.amenitiesGrid}>
                {bien.equipements.map((eq: string, i: number) => (
                  <View key={`eq-${i}`} style={styles.amenityItem}>
                    <Ionicons name="checkmark" size={16} color={colors.light.secondary} />
                    <Text style={styles.amenityText}>{eq}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
            </View>
          )}

          {/* Location Map */}
          <Text style={styles.sectionTitle}>Emplacement</Text>
          <Text style={styles.locationSubText}>{bien.adresse}, {bien.ville}</Text>
          <View style={styles.mapFrame}>
            <BienMap
              properties={[
                {
                  id: bien.id,
                  titre: bien.titre,
                  loyer: bien.loyer,
                  lat: bien.lat,
                  lng: bien.lng,
                },
              ]}
              initialLatitude={bien.lat}
              initialLongitude={bien.lng}
            />
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom action bar */}
      <View style={[styles.floatingBottomBar, shadows.lg]}>
        <View style={styles.bottomBarPriceContainer}>
          <Text style={styles.bottomPriceValue}>
            {nightPrice} €
            <Text style={styles.bottomPriceLabel}> / nuit</Text>
          </Text>
          <Text style={styles.bottomPriceLoyerSub}>
            Loyer : {bien.loyer.toLocaleString('fr-FR')} € / mois
          </Text>
        </View>

        <Button
          label="Réserver"
          onPress={() => router.push({ pathname: '/reservation', params: { id: bien.id } })}
          style={styles.reserveBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    paddingBottom: 110, // spacer for bottom action bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.light.error,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  backBtn: {
    paddingHorizontal: spacing.xl,
  },
  floatingBackButton: {
    position: 'absolute',
    top: spacing.md + (Platform.OS === 'ios' ? 10 : 0),
    left: spacing.md,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentCard: {
    backgroundColor: colors.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: spacing.xl,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  titleText: {
    fontSize: fontSize.xl - 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValueText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginLeft: 4,
  },
  reviewsCountText: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginLeft: spacing.xs,
  },
  bulletSeparator: {
    marginHorizontal: spacing.sm,
    color: colors.palette.gray[300],
    fontSize: fontSize.sm,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: spacing.md,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginLeft: spacing.sm,
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostTextContainer: {
    marginLeft: spacing.md,
  },
  hostLabel: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.heavy,
    color: colors.palette.gray[400],
    letterSpacing: 0.5,
  },
  hostName: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginTop: 2,
  },
  hostMeta: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.palette.gray[600],
    lineHeight: 22,
  },
  expandPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  expandText: {
    color: colors.light.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  amenityText: {
    fontSize: fontSize.sm,
    color: colors.palette.gray[600],
    marginLeft: spacing.sm,
  },
  locationSubText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginBottom: spacing.md,
  },
  mapFrame: {
    height: 180,
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  // FLOATING BOTTOM ACTION BAR STYLES
  floatingBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.light.surface,
    borderTopWidth: 1.5,
    borderTopColor: colors.light.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  bottomBarPriceContainer: {
    flex: 0.55,
  },
  bottomPriceValue: {
    fontSize: fontSize.xl - 2,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
  },
  bottomPriceLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    color: colors.light.textMuted,
  },
  bottomPriceLoyerSub: {
    fontSize: fontSize.xs - 1,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  reserveBtn: {
    flex: 0.4,
  },
});

// FICHIER SUIVANT : mobile/app/(client)/reservation.tsx
