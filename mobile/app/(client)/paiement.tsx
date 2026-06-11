// mobile/app/(client)/paiement.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getReservationById } from '../../src/api/reservations.api';
import { initierPaiement } from '../../src/api/paiements.api';
import { paiementService } from '../../src/services/paiement.service';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../src/constants/spacing';
import { Reservation, Paiement } from '../../src/types/models';

type PaymentMethod = 'CARTE' | 'WAVE' | 'ORANGE_MONEY';
type PaymentStep = 'select' | 'card_form' | 'processing' | 'success' | 'failure';

/**
 * Payment checkout transaction Screen.
 * Integrates payment selectors (Wave/OM/Credit Card), mock forms, deep-linking,
 * status polling hooks, and displays explicit success/failure boards.
 */
export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Reservation ID
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<PaymentStep>('select');
  const [method, setMethod] = useState<PaymentMethod>('CARTE');
  
  // Card input states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Polling state details
  const [activePaiement, setActivePaiement] = useState<Paiement | null>(null);
  const [statusMessage, setStatusMessage] = useState('Attente de validation...');

  useEffect(() => {
    if (id) {
      loadReservation();
    }
  }, [id]);

  const loadReservation = async () => {
    setIsLoading(true);
    try {
      const data = await getReservationById(id!);
      setReservation(data);
      setStep('select');
    } catch (err) {
      console.error('Failed to load reservation for payment:', err);
      Alert.alert('Erreur', 'Impossible de charger la réservation à régler.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async () => {
    if (!reservation) return;

    if (method === 'CARTE' && step === 'select') {
      // Transition to card input form step
      setStep('card_form');
      return;
    }

    setIsLoading(true);
    setStep('processing');
    setStatusMessage("Initialisation de la transaction...");

    try {
      // 1. Submit initiation request to backend payment controller
      const result = await initierPaiement({
        reservationId: reservation.id,
        methode: method,
      });

      setActivePaiement(result.paiement);

      // 2. Process deeplinking / USSD triggers
      if (method === 'WAVE' && result.paymentDetails.waveUrl) {
        setStatusMessage("Ouverture de l'application Wave...");
        await paiementService.openCheckoutLink(result.paymentDetails.waveUrl);
      } else if (method === 'ORANGE_MONEY' && result.paymentDetails.ussdCode) {
        setStatusMessage("Lancement du code USSD Orange Money...");
        await paiementService.openCheckoutLink(result.paymentDetails.ussdCode);
      } else {
        setStatusMessage("Débit de votre carte bancaire...");
        // Simulated Stripe/card network delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // 3. Start Polling backend status check loop
      setStatusMessage("En attente de confirmation bancaire...");
      const confirmedPayment = await paiementService.verifierStatut(result.paiement.id);
      
      setStep('success');
    } catch (error: any) {
      console.error('Payment flow failed:', error);
      setStep('failure');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && step === 'select') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Règlement sécurisé</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* STEP: SELECT PAYMENT METHOD */}
        {step === 'select' && reservation && (
          <View>
            {/* Amount details card */}
            <Card shadow={true} style={styles.amountCard}>
              <Text style={styles.amountLabel}>MONTANT À RÉGLER</Text>
              <Text style={styles.amountVal}>
                {reservation.montantTotal.toLocaleString('fr-FR')} €
              </Text>
              <Text style={styles.bookingRefText}>
                Réservation #{reservation.id.substring(0, 8)}
              </Text>
            </Card>

            <Text style={styles.sectionTitle}>Moyen de paiement</Text>

            {/* Carte selection */}
            <Pressable
              onPress={() => setMethod('CARTE')}
              style={[styles.methodItem, method === 'CARTE' && styles.methodItemActive]}
            >
              <Ionicons
                name="card-outline"
                size={24}
                color={method === 'CARTE' ? colors.light.primary : colors.palette.gray[500]}
              />
              <Text style={styles.methodName}>Carte Bancaire (Stripe)</Text>
              <View style={[styles.radio, method === 'CARTE' && styles.radioActive]} />
            </Pressable>

            {/* Wave selection */}
            <Pressable
              onPress={() => setMethod('WAVE')}
              style={[styles.methodItem, method === 'WAVE' && styles.methodItemActive]}
            >
              <Ionicons
                name="wallet-outline"
                size={24}
                color={method === 'WAVE' ? colors.light.primary : colors.palette.gray[500]}
              />
              <Text style={styles.methodName}>Wave Money</Text>
              <View style={[styles.radio, method === 'WAVE' && styles.radioActive]} />
            </Pressable>

            {/* OM selection */}
            <Pressable
              onPress={() => setMethod('ORANGE_MONEY')}
              style={[styles.methodItem, method === 'ORANGE_MONEY' && styles.methodItemActive]}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={24}
                color={method === 'ORANGE_MONEY' ? colors.light.primary : colors.palette.gray[500]}
              />
              <Text style={styles.methodName}>Orange Money (USSD)</Text>
              <View style={[styles.radio, method === 'ORANGE_MONEY' && styles.radioActive]} />
            </Pressable>

            <Button
              label={method === 'CARTE' ? 'Saisir les coordonnées' : 'Procéder au paiement'}
              onPress={handlePay}
              fullWidth={true}
              style={styles.payBtn}
            />
          </View>
        )}

        {/* STEP: MOCK CREDIT CARD FORM */}
        {step === 'card_form' && reservation && (
          <View>
            <Text style={styles.formTitle}>Informations de la carte</Text>
            
            <Input
              label="Numéro de carte"
              placeholder="4242 4242 4242 4242"
              keyboardType="number-pad"
              maxLength={19}
              value={cardNumber}
              onChangeText={setCardNumber}
              leftIcon={<Ionicons name="card-outline" size={18} color={colors.palette.gray[400]} />}
            />

            <View style={styles.cardDoubleRow}>
              <Input
                label="Expiration"
                placeholder="MM/AA"
                keyboardType="number-pad"
                maxLength={5}
                value={cardExpiry}
                onChangeText={setCardExpiry}
                containerStyle={{ flex: 0.48 }}
              />
              <Input
                label="CVC / CVV"
                placeholder="123"
                keyboardType="number-pad"
                maxLength={3}
                secureTextEntry={true}
                value={cardCvv}
                onChangeText={setCardCvv}
                containerStyle={{ flex: 0.48 }}
              />
            </View>

            <Button
              label={`Payer ${reservation.montantTotal} €`}
              onPress={handlePay}
              loading={isLoading}
              fullWidth={true}
              style={styles.payBtn}
            />

            <Pressable onPress={() => setStep('select')} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Modifier le moyen de paiement</Text>
            </Pressable>
          </View>
        )}

        {/* STEP: PROCESSING VIEW */}
        {step === 'processing' && (
          <View style={styles.statusView}>
            <ActivityIndicator size="large" color={colors.light.primary} style={{ marginBottom: spacing.lg }} />
            <Text style={styles.statusTitle}>Paiement en cours...</Text>
            <Text style={styles.statusDesc}>{statusMessage}</Text>
          </View>
        )}

        {/* STEP: SUCCESS VIEW */}
        {step === 'success' && (
          <View style={styles.statusView}>
            <View style={[styles.statusIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="checkmark" size={48} color={colors.light.success} />
            </View>
            <Text style={styles.statusTitle}>Séjour réservé ! 🎉</Text>
            <Text style={styles.statusDesc}>
              Votre paiement a été validé avec succès. Votre reçu de transaction PDF est en cours de création.
            </Text>

            <Button
              label="Accéder à l'historique"
              onPress={() => router.replace('/historique')}
              fullWidth={true}
              style={styles.statusActionBtn}
            />
          </View>
        )}

        {/* STEP: FAILURE VIEW */}
        {step === 'failure' && (
          <View style={styles.statusView}>
            <View style={[styles.statusIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="close" size={48} color={colors.light.error} />
            </View>
            <Text style={styles.statusTitle}>Échec du règlement</Text>
            <Text style={styles.statusDesc}>
              La transaction a échoué ou a été interrompue. Veuillez vérifier votre solde ou réessayer ultérieurement.
            </Text>

            <Button
              label="Réessayer"
              onPress={loadReservation}
              fullWidth={true}
              style={styles.statusActionBtn}
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountCard: {
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.xl,
  },
  amountLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.heavy,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.8,
  },
  amountVal: {
    fontSize: fontSize.xxxl - 4,
    fontWeight: fontWeight.bold,
    color: colors.palette.white,
    marginTop: spacing.xs,
  },
  bookingRefText: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.md,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    marginBottom: spacing.sm,
  },
  methodItemActive: {
    borderColor: colors.light.primary,
    backgroundColor: 'rgba(83, 74, 183, 0.03)',
  },
  methodName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginLeft: spacing.md,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.light.border,
  },
  radioActive: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primary,
    borderWidth: 5,
  },
  payBtn: {
    marginTop: spacing.xl,
  },

  // CARD FORM STYLES
  formTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.lg,
  },
  cardDoubleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelLink: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  cancelLinkText: {
    color: colors.light.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // STATUS VIEW SCREEN STYLES
  statusView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  statusIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  statusTitle: {
    fontSize: fontSize.xl - 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  statusActionBtn: {
    marginTop: spacing.xxl,
  },
});

// FICHIER SUIVANT : mobile/app/(client)/historique.tsx
