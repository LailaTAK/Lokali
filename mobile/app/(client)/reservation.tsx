// mobile/app/(client)/reservation.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBiens } from '../../src/hooks/useBiens';
import { useReservationsStore } from '../../src/stores/reservations.store';
import { CalendrierPicker } from '../../src/components/CalendrierPicker';
import { RecapReservation } from '../../src/components/RecapReservation';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight } from '../../src/constants/spacing';
import { createReservation } from '../../src/api/reservations.api';

/**
 * Reservation Checkout Screen.
 * Orchestrates date range pickers, optional message input, dynamic recap totals,
 * and sends reservation requests to the backend with history routing on success.
 */
export default function ReservationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bienSelectionne, selectedBienAnnonces, fetchBienWithCache } = useBiens();
  const { createReservation: storeCreateReservation, isLoading: isCreating } = useReservationsStore();

  const [selectedRange, setSelectedRange] = useState<{
    checkIn: Date;
    checkOut: Date;
    nbNuits: number;
    montantTotal: number;
  } | null>(null);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Load property details and linked announcements on mount
  useEffect(() => {
    if (id) {
      fetchBienWithCache(id);
    }
  }, [id]);

  if (!bienSelectionne || selectedBienAnnonces.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Chargement des détails de l'annonce...</Text>
      </View>
    );
  }

  const bien = bienSelectionne;
  // Get active announcement linked to this property
  const activeAnnonce = selectedBienAnnonces[0];

  // Calculate pricing per night
  const nightPrice = activeAnnonce.prixParNuit || Math.round(bien.loyer / 30);

  const handleSelectDates = (dates: any) => {
    setSelectedRange(dates);
  };

  const handleConfirmReservation = async () => {
    if (!selectedRange) {
      Alert.alert('Erreur', 'Veuillez sélectionner vos dates de séjour.');
      return;
    }

    setLoading(true);
    try {
      // Dispatch API request to create pending reservation request
      await createReservation({
        annonceId: activeAnnonce.id,
        dateDebut: selectedRange.checkIn.toISOString().split('T')[0],
        dateFin: selectedRange.checkOut.toISOString().split('T')[0],
        message: message.trim() ? message : undefined,
      });

      Alert.alert(
        'Demande envoyée ! 🎉',
        'Votre demande de réservation a été transmise à l\'hôte. Vous recevrez une notification dès qu\'elle sera acceptée.',
        [
          {
            text: 'Voir mon historique',
            onPress: () => router.replace('/(client)/historique'),
          },
        ]
      );
    } catch (err: any) {
      console.error('Failed to submit booking reservation:', err);
      const errMsg = err.response?.data?.message || 'Une erreur est survenue lors de la réservation.';
      Alert.alert('Erreur de réservation', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Réserver votre séjour</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step 1: Pick dates */}
        <Text style={styles.sectionTitle}>1. Sélectionnez vos dates</Text>
        <CalendrierPicker
          prixParNuit={nightPrice}
          onSelectDates={handleSelectDates}
          // We can pass simulated reserved ranges for the demo
          reservationsExistantes={[
            { debut: '2026-06-15', fin: '2026-06-18' },
            { debut: '2026-06-25', fin: '2026-06-30' },
          ]}
        />

        {/* Step 2: Message to host */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          2. Message pour l'hôte (optionnel)
        </Text>
        <Input
          placeholder="Présentez-vous brièvement et indiquez vos heures d'arrivée prévues..."
          multiline={true}
          value={message}
          onChangeText={setMessage}
          style={styles.messageInput}
        />

        {/* Step 3: Recap & Submit */}
        {selectedRange && (
          <View style={styles.recapContainer}>
            <Text style={styles.sectionTitle}>3. Récapitulatif du séjour</Text>
            <RecapReservation
              annonce={{
                titre: activeAnnonce.titre || bien.titre,
                prixParNuit: nightPrice,
                photoUrl: bien.photoUrls?.[0] || bien.photos?.[0],
                ville: bien.ville,
              }}
              checkIn={selectedRange.checkIn}
              checkOut={selectedRange.checkOut}
              nbNuits={selectedRange.nbNuits}
              montantTotal={selectedRange.montantTotal}
              loading={loading}
              onConfirm={handleConfirmReservation}
            />
          </View>
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
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
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginTop: spacing.md,
    fontWeight: fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.md,
  },
  messageInput: {
    height: 100,
  },
  recapContainer: {
    marginTop: spacing.xl,
  },
});

// FICHIER SUIVANT : mobile/app/(client)/paiement.tsx
