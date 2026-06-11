// mobile/app/(client)/index.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBiens } from '../../src/hooks/useBiens';
import { BienCard } from '../../src/components/BienCard';
import { BienMap } from '../../src/components/BienMap';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../src/constants/spacing';
import { Bien } from '../../src/types/models';

// Category types list
const CATEGORIES = [
  { id: 'all', label: 'Tout', value: undefined },
  { id: 'app', label: 'Appartements', value: 'APPARTEMENT' },
  { id: 'mai', label: 'Maisons', value: 'MAISON' },
  { id: 'stu', label: 'Studios', value: 'STUDIO' },
  { id: 'cha', label: 'Chambres', value: 'CHAMBRE' },
];

/**
 * Main Explorer listing Screen for clients.
 * Combines search queries, category filters, List/Map views, skeleton loading states,
 * and pull-to-refresh pagination.
 */
export default function ExploreScreen() {
  const {
    biens,
    filters,
    pagination,
    isLoading,
    refresh,
    loadMore,
    updateFiltersDebounced,
  } = useBiens();

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  // Search local form states
  const [searchCity, setSearchCity] = useState('');
  const [searchGuests, setSearchGuests] = useState('');

  // Initial load
  useEffect(() => {
    refresh();
  }, []);

  const handleSelectCategory = (value: string | undefined) => {
    updateFiltersDebounced({ type: value as any });
  };

  const handleSearchSubmit = () => {
    updateFiltersDebounced({
      ville: searchCity ? searchCity : undefined,
      nbPiecesMin: searchGuests ? parseInt(searchGuests, 10) : undefined,
    });
    setSearchModalVisible(false);
  };

  const handleResetSearch = () => {
    setSearchCity('');
    setSearchGuests('');
    updateFiltersDebounced({
      ville: undefined,
      nbPiecesMin: undefined,
    });
    setSearchModalVisible(false);
  };

  // Render Skeleton cells when initial loading occurs
  const renderSkeletons = () => {
    return (
      <ScrollView contentContainerStyle={styles.listContainer}>
        {Array.from({ length: 3 }).map((_, i) => (
          <BienCard key={`sk-${i}`} titre="" ville="" loyer={0} type="" loading={true} />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search and Action Bar */}
      <View style={styles.searchBarRow}>
        <Pressable
          onPress={() => setSearchModalVisible(true)}
          style={[styles.searchButton, shadows.sm]}
        >
          <Ionicons name="search-outline" size={20} color={colors.light.primary} />
          <Text style={styles.searchButtonText}>
            {filters.ville ? `${filters.ville} • ` : 'Où allez-vous ?'}
            {filters.nbPiecesMin ? ` ${filters.nbPiecesMin}+ pièces` : ''}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          style={[styles.toggleModeButton, shadows.sm]}
        >
          <Ionicons
            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
            size={20}
            color={colors.light.primary}
          />
        </Pressable>
      </View>

      {/* Categories Filter list */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = filters.type === cat.value;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleSelectCategory(cat.value)}
                style={[
                  styles.categoryTag,
                  isSelected && styles.categoryTagActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Listing View (List or Map) */}
      {isLoading && biens.length === 0 ? (
        renderSkeletons()
      ) : viewMode === 'list' ? (
        <FlatList
          data={biens}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          onRefresh={refresh}
          refreshing={isLoading && pagination.page === 1}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.palette.gray[300]} />
              <Text style={styles.emptyTitle}>Aucun bien trouvé</Text>
              <Text style={styles.emptySubtitle}>Essayez de modifier vos critères de recherche.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <BienCard
              photo={item.photos && item.photos[0]}
              titre={item.titre}
              ville={item.ville}
              loyer={item.loyer}
              type={item.type}
              statut={item.statut}
              onPress={() => router.push({ pathname: '/bien/[id]', params: { id: item.id } })}
            />
          )}
        />
      ) : (
        <View style={styles.mapContainer}>
          <BienMap
            properties={biens.map((b) => ({
              id: b.id,
              titre: b.titre,
              loyer: b.loyer,
              lat: b.lat,
              lng: b.lng,
              photo: b.photos?.[0],
            }))}
            onSelectProperty={(id) => router.push({ pathname: '/bien/[id]', params: { id } })}
          />
        </View>
      )}

      {/* SEARCH MODAL DIALOG */}
      <Modal
        visible={searchModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recherche de séjour</Text>
              <Pressable onPress={() => setSearchModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.light.text} />
              </Pressable>
            </View>

            {/* City Input */}
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Destination (Ville)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={colors.palette.gray[400]} />
                <TextInput
                  placeholder="Ex: Dakar, Paris, Lyon"
                  style={styles.textInput}
                  value={searchCity}
                  onChangeText={setSearchCity}
                />
              </View>
            </View>

            {/* Guest count pieces input */}
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Nombre de pièces min</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={20} color={colors.palette.gray[400]} />
                <TextInput
                  placeholder="Ex: 2"
                  keyboardType="number-pad"
                  style={styles.textInput}
                  value={searchGuests}
                  onChangeText={setSearchGuests}
                />
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.modalActionsRow}>
              <Pressable onPress={handleResetSearch} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Effacer tout</Text>
              </Pressable>
              <Pressable onPress={handleSearchSubmit} style={styles.searchSubmitBtn}>
                <Text style={styles.searchSubmitBtnText}>Rechercher</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  searchBarRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    marginRight: spacing.sm,
  },
  searchButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.light.text,
    marginLeft: spacing.sm,
  },
  toggleModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.surface,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  categoriesScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.palette.gray[100],
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryTagActive: {
    backgroundColor: 'rgba(83, 74, 183, 0.12)',
    borderColor: colors.light.primary,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.light.textMuted,
  },
  categoryTextActive: {
    color: colors.light.primary,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  mapContainer: {
    flex: 1,
  },

  // SEARCH MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.light.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.md + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  inputBlock: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.light.text,
    marginLeft: spacing.sm,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resetBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  resetBtnText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    fontWeight: fontWeight.semibold,
  },
  searchSubmitBtn: {
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  searchSubmitBtnText: {
    color: colors.palette.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

// FICHIER SUIVANT : mobile/app/(client)/bien/[id].tsx
