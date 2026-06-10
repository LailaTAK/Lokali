// mobile/app/(loueur)/biens/index.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBiensStore } from '../../../src/stores/biens.store';
import { changerStatut } from '../../../src/api/biens.api';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../../src/constants/spacing';
import { Bien } from '../../../src/types/models';

type FilterStatut = 'ALL' | 'DISPONIBLE' | 'EN_TRAVAUX' | 'INDISPONIBLE';

/**
 * Host Properties Management List Screen.
 * Renders lists of properties with quick CTAs (edit, status toggles, deletion triggers),
 * filter parameters, and a float add "+" button (FAB).
 */
export default function BiensListScreen() {
  const { biens, isLoading, fetchBiens, deleteBien, updateBien } = useBiensStore();
  const [filterStatut, setFilterStatut] = useState<FilterStatut>('ALL');

  const reloadData = async () => {
    try {
      await fetchBiens(true);
    } catch (err) {
      console.error('Failed to load host properties:', err);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleToggleStatus = (bienId: string, currentStatus: string) => {
    const nextStatuses: Record<string, 'DISPONIBLE' | 'EN_TRAVAUX' | 'INDISPONIBLE'> = {
      DISPONIBLE: 'EN_TRAVAUX',
      EN_TRAVAUX: 'INDISPONIBLE',
      INDISPONIBLE: 'DISPONIBLE',
    };

    const targetStatus = nextStatuses[currentStatus] || 'DISPONIBLE';

    Alert.alert(
      'Modifier la disponibilité',
      `Passer le statut de cette propriété à ${targetStatus.toLowerCase()} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, modifier',
          onPress: async () => {
            try {
              // Call API
              const updated = await changerStatut(bienId, targetStatus);
              // Update local state store
              useBiensStore.setState({
                biens: biens.map((b) => (b.id === bienId ? { ...b, statut: targetStatus } : b)),
              });
            } catch (err: any) {
              Alert.alert('Erreur', 'Impossible de modifier le statut de disponibilité.');
            }
          },
        },
      ]
    );
  };

  const handleDeletePress = (bienId: string) => {
    Alert.alert(
      'Supprimer la propriété',
      'Voulez-vous vraiment supprimer cette propriété ? Les annonces associées seront archivées.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBien(bienId);
              Alert.alert('Succès', 'La propriété a été supprimée.');
            } catch (err: any) {
              const errMsg = err.response?.data?.message || 'Erreur lors de la suppression.';
              Alert.alert('Erreur', errMsg);
            }
          },
        },
      ]
    );
  };

  // Filter properties by selected status tab
  const getFilteredBiens = (): Bien[] => {
    if (filterStatut === 'ALL') return biens;
    return biens.filter((b) => b.statut === filterStatut);
  };

  const filteredData = getFilteredBiens();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Mes propriétés</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Segment Tabs */}
      <View style={styles.filterTabsContainer}>
        {(['ALL', 'DISPONIBLE', 'EN_TRAVAUX', 'INDISPONIBLE'] as FilterStatut[]).map((tab) => {
          const isSelected = filterStatut === tab;
          const labelMap: Record<FilterStatut, string> = {
            ALL: 'Tout',
            DISPONIBLE: 'Dispo',
            EN_TRAVAUX: 'Travaux',
            INDISPONIBLE: 'Indispo',
          };
          return (
            <Pressable
              key={tab}
              onPress={() => setFilterStatut(tab)}
              style={[styles.filterTabBtn, isSelected && styles.filterTabBtnActive]}
            >
              <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                {labelMap[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* FlatList Biens */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={reloadData}
        refreshing={isLoading && biens.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={48} color={colors.palette.gray[300]} />
            <Text style={styles.emptyText}>Aucune propriété trouvée.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.bienCard} shadow={true}>
            {/* Header: title & status */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTextContainer}>
                <Text numberOfLines={1} style={styles.bienTitle}>
                  {item.titre}
                </Text>
                <Text style={styles.bienSubtitle}>
                  {item.type} • {item.ville}
                </Text>
              </View>
              <Badge status={item.statut} />
            </View>

            {/* Price Details */}
            <View style={styles.cardDetails}>
              <Text style={styles.rentLabel}>
                Loyer mensuel :{' '}
                <Text style={styles.rentValue}>
                  {item.loyer.toLocaleString('fr-FR')} €
                </Text>
              </Text>
              <Text style={styles.specsLabel}>
                {item.superficie} m² • {item.nbPieces} pièces
              </Text>
            </View>

            {/* Actions Block */}
            <View style={styles.actionsContainer}>
              <Pressable
                onPress={() => handleToggleStatus(item.id, item.statut)}
                style={styles.actionIconButton}
                hitSlop={10}
              >
                <Ionicons name="sync-outline" size={18} color={colors.light.primary} />
                <Text style={styles.actionIconText}>Statut</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(loueur)/biens/[id]/modifier',
                    params: { id: item.id },
                  })
                }
                style={[styles.actionIconButton, { marginLeft: spacing.md }]}
                hitSlop={10}
              >
                <Ionicons name="create-outline" size={18} color={colors.light.secondary} />
                <Text style={styles.actionIconText}>Modifier</Text>
              </Pressable>

              <Pressable
                onPress={() => handleDeletePress(item.id)}
                style={[styles.actionIconButton, { marginLeft: 'auto' }]}
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={18} color={colors.light.error} />
                <Text style={[styles.actionIconText, { color: colors.light.error }]}>Supprimer</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />

      {/* Floating Action Button (FAB) "+" */}
      <Pressable
        onPress={() => router.push('/(loueur)/biens/ajouter')}
        style={[styles.fab, shadows.md]}
      >
        <Ionicons name="add" size={28} color={colors.palette.white} />
      </Pressable>
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
  filterTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  filterTabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  filterTabBtnActive: {
    borderColor: colors.light.primary,
  },
  filterTabText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.light.textMuted,
  },
  filterTabTextActive: {
    color: colors.light.primary,
    fontWeight: fontWeight.bold,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100, // Spacer for floating FAB button
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginTop: spacing.md,
  },
  bienCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderTextContainer: {
    flex: 0.8,
  },
  bienTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  bienSubtitle: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  cardDetails: {
    marginVertical: spacing.sm,
  },
  rentLabel: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    fontWeight: fontWeight.medium,
  },
  rentValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  specsLabel: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  actionIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionIconText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// FICHIER SUIVANT : mobile/app/(loueur)/biens/ajouter.tsx
