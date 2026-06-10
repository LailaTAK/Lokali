// mobile/src/components/RecapReservation.tsx

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/spacing';
import { Button } from './Button';

export interface RecapReservationProps {
  annonce: {
    titre: string;
    prixParNuit: number;
    photoUrl?: string | null;
    ville: string;
  };
  checkIn: Date;
  checkOut: Date;
  nbNuits: number;
  montantTotal: number;
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * Detailed booking reservation summary block.
 * Displays property details, dates summary, nights calculator, service fees, and checkout action.
 */
export const RecapReservation: React.FC<RecapReservationProps> = ({
  annonce,
  checkIn,
  checkOut,
  nbNuits,
  montantTotal,
  loading = false,
  onConfirm,
}) => {
  // Calculate pricing values
  const rawSubtotal = nbNuits * annonce.prixParNuit;
  
  // Platform fee simulated at 5.5%
  const feeRate = 0.055;
  const platformFees = Number((rawSubtotal * feeRate).toFixed(2));
  
  const finalTotal = Number((rawSubtotal + platformFees).toFixed(2));

  return (
    <View style={[styles.container, shadows.md]}>
      {/* Listing Details Header Row */}
      <View style={styles.headerRow}>
        <Image
          source={{ uri: annonce.photoUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=300&q=80' }}
          style={styles.thumbnail}
        />
        <View style={styles.headerTextContainer}>
          <Text numberOfLines={2} style={styles.annonceTitle}>
            {annonce.titre}
          </Text>
          <Text style={styles.annonceLocation}>
            À {annonce.ville}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Dates breakdown */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionLabel}>Détails de la réservation</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>ARRIVÉE</Text>
          <Text style={styles.dateValue}>{checkIn.toLocaleDateString('fr-FR')}</Text>
        </View>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>DÉPART</Text>
          <Text style={styles.dateValue}>{checkOut.toLocaleDateString('fr-FR')}</Text>
        </View>
      </View>

      <View style={styles.nightsCountRow}>
        <Text style={styles.infoText}>Durée du séjour :</Text>
        <Text style={styles.infoValueText}>{nbNuits} nuits</Text>
      </View>

      <View style={styles.divider} />

      {/* Pricing breakdown list */}
      <Text style={styles.sectionLabel}>Détails du paiement</Text>

      <View style={styles.priceItemRow}>
        <Text style={styles.priceItemName}>
          {annonce.prixParNuit} € x {nbNuits} nuits
        </Text>
        <Text style={styles.priceItemVal}>
          {rawSubtotal.toLocaleString('fr-FR')} €
        </Text>
      </View>

      <View style={styles.priceItemRow}>
        <Text style={styles.priceItemName}>Frais de service LOKALI (5.5%)</Text>
        <Text style={styles.priceItemVal}>
          {platformFees.toLocaleString('fr-FR')} €
        </Text>
      </View>

      <View style={[styles.priceItemRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total (EUR)</Text>
        <Text style={styles.totalVal}>
          {finalTotal.toLocaleString('fr-FR')} €
        </Text>
      </View>

      {/* Checkout Submit Button */}
      <Button
        label="Confirmer et régler"
        onPress={onConfirm}
        loading={loading}
        fullWidth={true}
        style={styles.submitBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.light.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    backgroundColor: colors.palette.gray[200],
    resizeMode: 'cover',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  annonceTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    lineHeight: 20,
  },
  annonceLocation: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1.5,
    backgroundColor: colors.light.border,
    marginVertical: spacing.md,
  },
  sectionTitleRow: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dateBlock: {
    flex: 0.48,
    backgroundColor: colors.palette.gray[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
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
  nightsCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.light.text,
  },
  infoValueText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  priceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  priceItemName: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
  },
  priceItemVal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
  },
  totalRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: colors.light.border,
    marginBottom: spacing.lg,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  totalVal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});

// FICHIER SUIVANT : mobile/src/components/KpiCard.tsx
