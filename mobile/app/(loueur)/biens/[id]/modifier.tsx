// mobile/app/(loueur)/biens/[id]/modifier.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { getBienById, updateBien, uploadPhotos } from '../../../../src/api/biens.api';
import { useBiensStore } from '../../../../src/stores/biens.store';
import { Input } from '../../../../src/components/Input';
import { Button } from '../../../../src/components/Button';
import { colors } from '../../../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../../../src/constants/spacing';

// List of common amenities
const AMENITIES_LIST = [
  'Wi-Fi', 'Climatisation', 'Cuisine équipée', 'Machine à laver',
  'Piscine', 'Parking', 'Terrasse', 'Ascenseur', 'Chauffage'
];

/**
 * Edit Property Stepper Form Screen.
 * Preloads existing values by ID and implements a 4-step update flow.
 */
export default function ModifierBienScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form Fields
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'APPARTEMENT' | 'MAISON' | 'STUDIO' | 'CHAMBRE'>('APPARTEMENT');

  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [nbPieces, setNbPieces] = useState('');
  const [loyer, setLoyer] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch property details on mount
  useEffect(() => {
    if (id) {
      loadBienDetails();
    }
  }, [id]);

  const loadBienDetails = async () => {
    setInitialLoading(true);
    try {
      const data = await getBienById(id!);
      const bien = data.bien;
      setTitre(bien.titre);
      setDescription(bien.description);
      setType(bien.type);
      setAdresse(bien.adresse);
      setVille(bien.ville);
      setSuperficie(String(bien.superficie));
      setNbPieces(String(bien.nbPieces));
      setLoyer(String(bien.loyer));
      setSelectedAmenities(bien.equipements || []);
      setPhotos(bien.photos || bien.photoUrls || []);
    } catch (err) {
      console.error('Failed to load bien details:', err);
      Alert.alert('Erreur', 'Impossible de charger les détails de cette propriété.');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  // Step validation rules
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (titre.trim().length < 3) newErrors.titre = 'Le titre doit faire au moins 3 caractères.';
      if (description.trim().length < 10) newErrors.description = 'La description doit faire au moins 10 caractères.';
    } else if (step === 2) {
      if (!adresse.trim()) newErrors.adresse = 'L\'adresse est obligatoire.';
      if (!ville.trim()) newErrors.ville = 'La ville est obligatoire.';
      if (!superficie || isNaN(Number(superficie)) || Number(superficie) <= 0) {
        newErrors.superficie = 'Saisissez une superficie valide.';
      }
      if (!nbPieces || isNaN(Number(nbPieces)) || Number(nbPieces) <= 0) {
        newErrors.nbPieces = 'Saisissez un nombre de pièces valide.';
      }
      if (!loyer || isNaN(Number(loyer)) || Number(loyer) <= 0) {
        newErrors.loyer = 'Saisissez un montant de loyer valide.';
      }
    } else if (step === 3) {
      if (photos.length === 0) {
        Alert.alert('Image manquante', 'Veuillez ajouter au moins une photo pour votre bien.');
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAddPhotos = () => {
    // Simulate ImagePicker multi select
    const mockPhotos = [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80',
    ];
    setPhotos([...photos, ...mockPhotos]);
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleToggleAmenity = (name: string) => {
    setSelectedAmenities(
      selectedAmenities.includes(name)
        ? selectedAmenities.filter((a) => a !== name)
        : [...selectedAmenities, name]
    );
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const payload = {
        titre,
        description,
        adresse,
        ville,
        superficie: Number(superficie),
        nbPieces: Number(nbPieces),
        loyer: Number(loyer),
        type,
        equipements: selectedAmenities,
        photos, // send updated photos list keys
      };

      await updateBien(id!, payload);

      Alert.alert('Propriété mise à jour ! 🎉', 'Vos modifications ont été enregistrées.', [
        {
          text: 'Fermer',
          onPress: () => {
            // Reload list and return
            useBiensStore.getState().fetchBiens(true);
            router.replace('/biens');
          },
        },
      ]);
    } catch (err) {
      console.error('Failed to update property:', err);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement de vos modifications.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Chargement de la propriété...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="close" size={24} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Modifier la propriété</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stepper bar */}
      <View style={styles.stepperContainer}>
        {Array.from({ length: 4 }).map((_, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isCompleted = step > num;
          return (
            <React.Fragment key={`step-${num}`}>
              <View
                style={[
                  styles.stepBubble,
                  isActive && styles.stepBubbleActive,
                  isCompleted && styles.stepBubbleCompleted,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={colors.palette.white} />
                ) : (
                  <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>{num}</Text>
                )}
              </View>
              {num < 4 && (
                <View style={[styles.stepLine, step > num && styles.stepLineActive]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* STEP 1: GENERAL INFO */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Informations Générales</Text>
            
            {/* Type Selection */}
            <Text style={styles.label}>Type de bien immobilier</Text>
            <View style={styles.typeRow}>
              {(['APPARTEMENT', 'MAISON', 'STUDIO', 'CHAMBRE'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                    {t.toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="Titre de l'annonce"
              value={titre}
              onChangeText={setTitre}
              error={errors.titre}
            />

            <Input
              label="Description détaillée"
              multiline={true}
              value={description}
              onChangeText={setDescription}
              error={errors.description}
            />
          </View>
        )}

        {/* STEP 2: DETAILS & AMENITIES */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Détails & Tarification</Text>
            
            <Input
              label="Adresse physique"
              value={adresse}
              onChangeText={setAdresse}
              error={errors.adresse}
            />

            <Input
              label="Ville"
              value={ville}
              onChangeText={setVille}
              error={errors.ville}
            />

            <View style={styles.inputDoubleRow}>
              <Input
                label="Superficie (m²)"
                keyboardType="numeric"
                value={superficie}
                onChangeText={setSuperficie}
                error={errors.superficie}
                containerStyle={{ flex: 0.48 }}
              />
              <Input
                label="Pièces"
                keyboardType="numeric"
                value={nbPieces}
                onChangeText={setNbPieces}
                error={errors.nbPieces}
                containerStyle={{ flex: 0.48 }}
              />
            </View>

            <Input
              label="Loyer mensuel hors charges (€)"
              keyboardType="numeric"
              value={loyer}
              onChangeText={setLoyer}
              error={errors.loyer}
              leftIcon={<Text style={styles.priceSymbol}>€</Text>}
            />

            {/* Amenities Checkbox Group */}
            <Text style={styles.label}>Équipements inclus</Text>
            <View style={styles.amenitiesGrid}>
              {AMENITIES_LIST.map((am) => {
                const checked = selectedAmenities.includes(am);
                return (
                  <Pressable
                    key={am}
                    onPress={() => handleToggleAmenity(am)}
                    style={[styles.amenityTag, checked && styles.amenityTagChecked]}
                  >
                    <Ionicons
                      name={checked ? 'checkmark-circle' : 'add-circle-outline'}
                      size={16}
                      color={checked ? colors.palette.white : colors.light.text}
                    />
                    <Text style={[styles.amenityTagText, checked && styles.amenityTagTextChecked]}>
                      {am}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 3: PHOTOS */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Photos du logement</Text>
            <Text style={styles.description}>
              Ajoutez des photos de haute qualité pour attirer les voyageurs. La première photo sera la photo de couverture.
            </Text>

            <Button
              label="Ajouter des photos"
              onPress={handleAddPhotos}
              variant="outline"
              icon={<Ionicons name="images-outline" size={18} color={colors.light.primary} />}
              fullWidth={true}
              style={{ marginBottom: spacing.lg }}
            />

            {/* Photos previews list */}
            {photos.length > 0 && (
              <View style={styles.photosGrid}>
                {photos.map((uri, index) => (
                  <View key={`img-${index}`} style={styles.photoContainer}>
                    <View style={styles.photoPreviewWrapper}>
                      <Text style={styles.photoIndexText}>{index === 0 ? 'Couverture' : `${index + 1}`}</Text>
                      <Pressable
                        onPress={() => handleDeletePhoto(index)}
                        style={styles.deletePhotoBtn}
                        hitSlop={10}
                      >
                        <Ionicons name="trash" size={16} color={colors.palette.white} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* STEP 4: RECAP & CONFIRM */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Vérification & Publication</Text>
            <Text style={styles.description}>
              Vérifiez les nouvelles informations de votre propriété avant d'enregistrer.
            </Text>

            <View style={styles.recapCard}>
              <View style={styles.recapItem}>
                <Text style={styles.recapLabel}>Titre :</Text>
                <Text style={styles.recapVal}>{titre}</Text>
              </View>
              <View style={styles.recapItem}>
                <Text style={styles.recapLabel}>Type & Ville :</Text>
                <Text style={styles.recapVal}>{type} à {ville}</Text>
              </View>
              <View style={styles.recapItem}>
                <Text style={styles.recapLabel}>Adresse :</Text>
                <Text style={styles.recapVal}>{adresse}</Text>
              </View>
              <View style={styles.recapItem}>
                <Text style={styles.recapLabel}>Dimensions :</Text>
                <Text style={styles.recapVal}>{superficie} m² • {nbPieces} pièces</Text>
              </View>
              <View style={styles.recapItem}>
                <Text style={styles.recapLabel}>Loyer :</Text>
                <Text style={[styles.recapVal, { color: colors.light.primary, fontWeight: fontWeight.bold }]}>
                  {Number(loyer).toLocaleString('fr-FR')} € / mois
                </Text>
              </View>
              <View style={styles.recapItem}>
                <Text style={styles.recapLabel}>Photos :</Text>
                <Text style={styles.recapVal}>{photos.length} photo(s) au total</Text>
              </View>
            </View>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.navigationRow}>
          {step > 1 && (
            <Button
              label="Retour"
              onPress={handleBack}
              variant="outline"
              disabled={loading}
              style={{ flex: 0.35 }}
            />
          )}
          
          {step < 4 ? (
            <Button
              label="Suivant"
              onPress={handleNext}
              style={{ flex: step === 1 ? 1 : 0.6 }}
            />
          ) : (
            <Button
              label="Enregistrer"
              onPress={handleUpdate}
              loading={loading}
              style={{ flex: 0.6 }}
            />
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
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
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  stepBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.palette.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBubbleActive: {
    backgroundColor: colors.light.primary,
  },
  stepBubbleCompleted: {
    backgroundColor: colors.light.secondary,
  },
  stepNum: {
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
    color: colors.palette.gray[500],
  },
  stepNumActive: {
    color: colors.palette.white,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.palette.gray[200],
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: colors.light.secondary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stepTitle: {
    fontSize: fontSize.md + 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  typeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.palette.gray[100],
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    backgroundColor: 'rgba(83, 74, 183, 0.12)',
    borderColor: colors.light.primary,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    textTransform: 'capitalize',
  },
  typeTextActive: {
    color: colors.light.primary,
  },
  inputDoubleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceSymbol: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.palette.gray[400],
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  amenityTagChecked: {
    backgroundColor: colors.light.secondary,
    borderColor: colors.light.secondary,
  },
  amenityTagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginLeft: 4,
  },
  amenityTagTextChecked: {
    color: colors.palette.white,
  },

  // PHOTOS STEPS STYLES
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    margin: '1.1%',
    backgroundColor: colors.palette.gray[200],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photoPreviewWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xs,
  },
  photoIndexText: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
    color: colors.palette.white,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  deletePhotoBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },

  // RECAP STEP STYLES
  recapCard: {
    backgroundColor: colors.light.surface,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  recapItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  recapLabel: {
    flex: 0.35,
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    fontWeight: fontWeight.semibold,
  },
  recapVal: {
    flex: 0.65,
    fontSize: fontSize.sm,
    color: colors.light.text,
    fontWeight: fontWeight.medium,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
