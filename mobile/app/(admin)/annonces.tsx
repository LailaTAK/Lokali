// mobile/app/(admin)/annonces.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../src/constants/spacing';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { client } from '../../src/api/client';
import { modererAnnonce } from '../../src/api/annonces.api';
import { Annonce, PaginatedResponse } from '../../src/types/models';

type TabType = 'EN_ATTENTE' | 'ACTIF' | 'REJETEE';

export default function AdminAnnoncesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('EN_ATTENTE');
  const [searchQuery, setSearchQuery] = useState('');
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [counts, setCounts] = useState({ EN_ATTENTE: 0, ACTIF: 0, REJETEE: 0 });

  // Moderation modal states
  const [selectedAnnonce, setSelectedAnnonce] = useState<Annonce | null>(null);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load announcements and counts
  const loadData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsLoading(true);
    try {
      // 1. Fetch listings for current tab
      const statusParam = activeTab; // EN_ATTENTE, ACTIF, REJETEE
      const response = await client.get<PaginatedResponse<Annonce>>('/admin/annonces', {
        params: { statut: statusParam, limit: 100 },
      });
      setAnnonces(response.data.data);

      // 2. Fetch counts for badges
      const waitRes = await client.get<PaginatedResponse<Annonce>>('/admin/annonces', { params: { statut: 'EN_ATTENTE', limit: 1 } });
      const approvedRes = await client.get<PaginatedResponse<Annonce>>('/admin/annonces', { params: { statut: 'ACTIF', limit: 1 } });
      const rejectedRes = await client.get<PaginatedResponse<Annonce>>('/admin/annonces', { params: { statut: 'REJETEE', limit: 1 } });
      
      setCounts({
        EN_ATTENTE: waitRes.data.meta.total,
        ACTIF: approvedRes.data.meta.total,
        REJETEE: rejectedRes.data.meta.total,
      });
    } catch (error) {
      console.error('Failed to load admin announcements:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les annonces.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  // Perform moderation: Approve
  const handleApprove = async (annonceId: string) => {
    Alert.alert(
      'Approuver l\'annonce',
      'Êtes-vous sûr de vouloir approuver cette annonce et la mettre en ligne ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          onPress: async () => {
            setIsLoading(true);
            try {
              await modererAnnonce(annonceId, { statut: 'ACTIF' });
              Alert.alert('Succès', 'L\'annonce a été approuvée.');
              loadData(false);
            } catch (err) {
              console.error(err);
              Alert.alert('Erreur', 'Impossible d\'approuver l\'annonce.');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Perform moderation: Reject
  const openRejectModal = (annonce: Annonce) => {
    setSelectedAnnonce(annonce);
    setRejectionReason('');
    setIsRejectModalVisible(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un motif de rejet.');
      return;
    }
    if (!selectedAnnonce) return;

    setIsSubmitting(true);
    try {
      await modererAnnonce(selectedAnnonce.id, {
        statut: 'REJETEE',
        motifRejet: rejectionReason.trim(),
      });
      setIsRejectModalVisible(false);
      Alert.alert('Succès', 'L\'annonce a été rejetée.');
      loadData(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de rejeter l\'annonce.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter listings based on search locally
  const filteredAnnonces = annonces.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.titre.toLowerCase().includes(query) ||
      (item.bien?.ville && item.bien.ville.toLowerCase().includes(query)) ||
      (item.bien?.loueur &&
        (`${item.bien.loueur.prenom} ${item.bien.loueur.nom}`).toLowerCase().includes(query))
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Modération</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.light.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par titre, ville, loueur..."
            placeholderTextColor={colors.light.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.light.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs Layout */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'EN_ATTENTE' && styles.activeTab]}
          onPress={() => setActiveTab('EN_ATTENTE')}
        >
          <Text style={[styles.tabLabel, activeTab === 'EN_ATTENTE' && styles.activeTabLabel]}>
            En attente
          </Text>
          {counts.EN_ATTENTE > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{counts.EN_ATTENTE}</Text>
            </View>
          )}
        </Pressable>
        
        <Pressable
          style={[styles.tab, activeTab === 'ACTIF' && styles.activeTab]}
          onPress={() => setActiveTab('ACTIF')}
        >
          <Text style={[styles.tabLabel, activeTab === 'ACTIF' && styles.activeTabLabel]}>
            Approuvées
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'REJETEE' && styles.activeTab]}
          onPress={() => setActiveTab('REJETEE')}
        >
          <Text style={[styles.tabLabel, activeTab === 'REJETEE' && styles.activeTabLabel]}>
            Rejetées
          </Text>
        </Pressable>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredAnnonces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color={colors.light.textMuted} />
              <Text style={styles.emptyText}>Aucune annonce dans cette catégorie.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.itemCard} shadow={true}>
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <Avatar
                    uri={item.bien?.loueur?.photo || null}
                    nom={item.bien?.loueur?.nom || ''}
                    prenom={item.bien?.loueur?.prenom || ''}
                    size="sm"
                  />
                  <View style={styles.userMeta}>
                    <Text style={styles.userName}>
                      {item.bien?.loueur?.prenom} {item.bien?.loueur?.nom}
                    </Text>
                    <Text style={styles.userRole}>Loueur</Text>
                  </View>
                </View>
                <Badge status={item.statut} />
              </View>

              <Text style={styles.listingTitle}>{item.titre}</Text>
              
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={14} color={colors.light.textMuted} />
                  <Text style={styles.detailText}>{item.bien?.ville || 'Inconnue'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={14} color={colors.light.textMuted} />
                  <Text style={styles.detailText}>{item.prixParNuit} € / nuit</Text>
                </View>
              </View>

              <Text style={styles.descriptionText} numberOfLines={2}>
                {item.description}
              </Text>

              {item.statut === 'REJETEE' && item.motifRejet && (
                <View style={styles.rejectionReasonBox}>
                  <Text style={styles.rejectionLabel}>Motif du rejet :</Text>
                  <Text style={styles.rejectionVal}>{item.motifRejet}</Text>
                </View>
              )}

              {/* Action Buttons for moderation */}
              {activeTab === 'EN_ATTENTE' && (
                <View style={styles.actionsRow}>
                  <Button
                    label="Rejeter"
                    variant="danger"
                    size="sm"
                    onPress={() => openRejectModal(item)}
                    style={styles.actionBtn}
                  />
                  <Button
                    label="Approuver"
                    variant="primary"
                    size="sm"
                    onPress={() => handleApprove(item.id)}
                    style={[styles.actionBtn, { marginLeft: spacing.sm }]}
                  />
                </View>
              )}
            </Card>
          )}
        />
      )}

      {/* Reject Reason Modal */}
      <Modal
        visible={isRejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRejectModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, shadows.lg]}>
            <Text style={styles.modalTitle}>Refuser l'annonce</Text>
            <Text style={styles.modalSubtitle}>
              Veuillez saisir le motif obligatoire de refus pour l'annonce "{selectedAnnonce?.titre}" :
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Ex. Photos floues, description insuffisante, critères non respectés..."
              placeholderTextColor={colors.light.placeholder}
              multiline={true}
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setIsRejectModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Annuler</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={handleRejectSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Rejeter</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: fontSize.md + 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  headerPlaceholder: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.light.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.light.text,
    fontSize: fontSize.sm,
    padding: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.light.primary,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.textMuted,
  },
  activeTabLabel: {
    color: colors.light.primary,
    fontWeight: fontWeight.bold,
  },
  badgeCount: {
    backgroundColor: colors.light.error,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeCountText: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginTop: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userMeta: {
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  userRole: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
  },
  listingTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  detailText: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginLeft: 4,
  },
  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    lineHeight: 20,
  },
  rejectionReasonBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  rejectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.light.error,
    marginBottom: 2,
  },
  rejectionVal: {
    fontSize: fontSize.xs + 1,
    color: colors.light.text,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    width: 110,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: fontSize.md + 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.light.text,
    fontSize: fontSize.sm,
    height: 100,
    textAlignVertical: 'top',
    backgroundColor: colors.light.background,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  modalCancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.light.border,
    marginRight: spacing.sm,
  },
  modalCancelBtnText: {
    color: colors.light.textMuted,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  modalConfirmBtn: {
    backgroundColor: colors.light.error,
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
});
