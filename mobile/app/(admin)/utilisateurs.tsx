// mobile/app/(admin)/utilisateurs.tsx

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
import { User, Reservation, PaginatedResponse } from '../../src/types/models';

type RoleFilterType = 'TOUS' | 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';

export default function AdminUtilisateursScreen() {
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('TOUS');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Profile modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  // Reservations modal states
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [isReservationsModalVisible, setIsReservationsModalVisible] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  // Load users list
  const loadUsers = useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsLoading(true);
    try {
      const response = await client.get<PaginatedResponse<User>>('/admin/utilisateurs', {
        params: { limit: 100 },
      });
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to load admin users:', error);
      Alert.alert('Erreur', 'Impossible de récupérer la liste des utilisateurs.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUsers(false);
  };

  // Block/Unblock user
  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    const actionText = currentStatus ? 'bloquer' : 'débloquer';
    Alert.alert(
      `${currentStatus ? 'Bloquer' : 'Débloquer'} l'utilisateur`,
      `Êtes-vous sûr de vouloir ${actionText} cet utilisateur ? Ses sessions actives seront révoquées s'il est bloqué.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: currentStatus ? 'Bloquer' : 'Débloquer',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            setIsLoading(true);
            try {
              await client.patch(`/admin/utilisateurs/${userId}/bloquer`);
              Alert.alert('Succès', `L'utilisateur a été ${currentStatus ? 'bloqué' : 'débloqué'}.`);
              loadUsers(false);
            } catch (err) {
              console.error(err);
              Alert.alert('Erreur', "Impossible de modifier le statut de l'utilisateur.");
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open Reservations Modal for User
  const handleViewReservations = async (targetUser: User) => {
    setSelectedUser(targetUser);
    setIsReservationsModalVisible(true);
    setIsLoadingReservations(true);
    setUserReservations([]);

    try {
      // Use query filters supported by our upgraded reservations service:
      // If CLIENT role, query clientId. If LOUEUR role, query loueurId.
      const paramKey = targetUser.role === 'CLIENT' ? 'clientId' : 'loueurId';
      const response = await client.get<PaginatedResponse<Reservation>>('/reservations', {
        params: { [paramKey]: targetUser.id, limit: 50 },
      });
      setUserReservations(response.data.data);
    } catch (err) {
      console.error('Failed to load user bookings:', err);
      Alert.alert('Erreur', 'Impossible de charger les réservations.');
    } finally {
      setIsLoadingReservations(false);
    }
  };

  // Filter users lists locally based on role tabs + text search queries
  const filteredUsers = users.filter((u) => {
    // 1. Role filter match
    if (roleFilter !== 'TOUS' && u.role !== roleFilter) {
      return false;
    }

    // 2. Search query match
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const name = `${u.prenom} ${u.nom}`.toLowerCase();
      const email = u.email.toLowerCase();
      const tel = u.telephone ? u.telephone.toLowerCase() : '';
      return name.includes(q) || email.includes(q) || tel.includes(q);
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Utilisateurs</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.light.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, email, téléphone..."
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

      {/* Role Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['TOUS', 'CLIENT', 'LOUEUR', 'ADMINISTRATEUR'] as RoleFilterType[]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.roleTab, roleFilter === item && styles.activeRoleTab]}
              onPress={() => setRoleFilter(item)}
            >
              <Text style={[styles.roleTabLabel, roleFilter === item && styles.activeRoleTabLabel]}>
                {item === 'TOUS' ? 'Tous' : item === 'LOUEUR' ? 'Loueurs' : item === 'CLIENT' ? 'Clients' : 'Admins'}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Users List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.light.textMuted} />
              <Text style={styles.emptyText}>Aucun utilisateur ne correspond aux critères.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.userCard} shadow={true}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Avatar
                    uri={item.photoUrl || null}
                    nom={item.nom}
                    prenom={item.prenom}
                    size="md"
                  />
                  <View style={styles.infoBlock}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userNameText}>
                        {item.prenom} {item.nom}
                      </Text>
                      {/* Active / Blocked indicator dot */}
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.actif ? colors.light.success : colors.light.error },
                        ]}
                      />
                    </View>
                    <Text style={styles.userEmailText}>{item.email}</Text>
                    <Text style={styles.roleLabelText}>{item.role}</Text>
                  </View>
                </View>

                {/* Inline Action Buttons */}
                <View style={styles.cardActions}>
                  <Button
                    label="Profil"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setSelectedUser(item);
                      setIsProfileModalVisible(true);
                    }}
                    style={styles.actionBtn}
                  />
                  
                  {item.role !== 'ADMINISTRATEUR' && (
                    <Button
                      label="Réservations"
                      variant="outline"
                      size="sm"
                      onPress={() => handleViewReservations(item)}
                      style={[styles.actionBtn, { marginLeft: spacing.sm }]}
                    />
                  )}

                  <Button
                    label={item.actif ? 'Bloquer' : 'Débloquer'}
                    variant={item.actif ? 'danger' : 'primary'}
                    size="sm"
                    onPress={() => handleToggleBlock(item.id, item.actif)}
                    style={[styles.actionBtn, { marginLeft: spacing.sm }]}
                  />
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {/* Profil Detail Modal */}
      <Modal
        visible={isProfileModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profil Utilisateur</Text>
              <Pressable onPress={() => setIsProfileModalVisible(false)} hitSlop={15}>
                <Ionicons name="close" size={24} color={colors.light.textMuted} />
              </Pressable>
            </View>

            {selectedUser && (
              <View style={styles.profileModalDetails}>
                <View style={styles.profileAvatarCenter}>
                  <Avatar
                    uri={selectedUser.photoUrl || null}
                    nom={selectedUser.nom}
                    prenom={selectedUser.prenom}
                    size="lg"
                  />
                  <Text style={styles.profileFullName}>
                    {selectedUser.prenom} {selectedUser.nom}
                  </Text>
                  <Badge label={selectedUser.role} variant="info" style={styles.profileRoleBadge} />
                </View>

                <View style={styles.detailsList}>
                  <View style={styles.detailRowItem}>
                    <Text style={styles.detailLabel}>Email :</Text>
                    <Text style={styles.detailValue}>{selectedUser.email}</Text>
                  </View>
                  <View style={styles.detailRowItem}>
                    <Text style={styles.detailLabel}>Téléphone :</Text>
                    <Text style={styles.detailValue}>{selectedUser.telephone || 'Non renseigné'}</Text>
                  </View>
                  <View style={styles.detailRowItem}>
                    <Text style={styles.detailLabel}>Statut compte :</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: selectedUser.actif ? colors.light.success : colors.light.error },
                      ]}
                    >
                      {selectedUser.actif ? 'Actif' : 'Bloqué / Inactif'}
                    </Text>
                  </View>
                  <View style={styles.detailRowItem}>
                    <Text style={styles.detailLabel}>Rejoint le :</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* User Reservations History Modal */}
      <Modal
        visible={isReservationsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsReservationsModalVisible(false)}
      >
        <SafeAreaView style={styles.fullModalOverlay}>
          <View style={styles.fullModalCard}>
            <View style={styles.fullModalHeader}>
              <View>
                <Text style={styles.fullModalTitle}>Réservations</Text>
                <Text style={styles.fullModalSubtitle}>
                  Historique de {selectedUser?.prenom} {selectedUser?.nom} ({selectedUser?.role})
                </Text>
              </View>
              <Pressable onPress={() => setIsReservationsModalVisible(false)} hitSlop={15}>
                <Ionicons name="close" size={28} color={colors.light.text} />
              </Pressable>
            </View>

            {isLoadingReservations ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.light.primary} />
              </View>
            ) : (
              <FlatList
                data={userReservations}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalListContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={48} color={colors.light.textMuted} />
                    <Text style={styles.emptyText}>Aucune réservation trouvée pour cet utilisateur.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Card style={styles.resCard} shadow={false}>
                    <View style={styles.resCardRow}>
                      <View style={styles.resMainInfo}>
                        <Text style={styles.resTitleText}>{item.bien?.titre || 'Bien immobilier'}</Text>
                        <Text style={styles.resDatesText}>
                          Du {new Date(item.checkIn).toLocaleDateString('fr-FR')} au{' '}
                          {new Date(item.checkOut).toLocaleDateString('fr-FR')}
                        </Text>
                        <Text style={styles.resMetaText}>
                          {item.nbNuits} nuits • Client: {item.client?.prenom} {item.client?.nom}
                        </Text>
                      </View>
                      <View style={styles.resSideInfo}>
                        <Text style={styles.resAmountText}>{item.montantTotal} €</Text>
                        <Badge status={item.statut} style={styles.resBadge} />
                      </View>
                    </View>
                  </Card>
                )}
              />
            )}
          </View>
        </SafeAreaView>
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
  tabsWrapper: {
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  tabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roleTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginRight: spacing.sm,
    backgroundColor: colors.light.background,
  },
  activeRoleTab: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  roleTabLabel: {
    fontSize: fontSize.xs + 1,
    color: colors.light.textMuted,
    fontWeight: fontWeight.medium,
  },
  activeRoleTabLabel: {
    color: '#fff',
    fontWeight: fontWeight.bold,
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
  userCard: {
    marginBottom: spacing.md,
  },
  cardContent: {
    flexDirection: 'column',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBlock: {
    marginLeft: spacing.md,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userNameText: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  userEmailText: {
    fontSize: fontSize.xs + 1,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  roleLabelText: {
    fontSize: fontSize.xs,
    color: colors.light.primary,
    fontWeight: fontWeight.bold,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    minWidth: 80,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.md + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  profileModalDetails: {
    alignItems: 'center',
  },
  profileAvatarCenter: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileFullName: {
    fontSize: fontSize.md + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginTop: spacing.sm,
  },
  profileRoleBadge: {
    marginTop: spacing.xs,
  },
  detailsList: {
    alignSelf: 'stretch',
  },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  detailLabel: {
    fontSize: fontSize.xs + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.textMuted,
  },
  detailValue: {
    fontSize: fontSize.xs + 1,
    color: colors.light.text,
  },
  fullModalOverlay: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  fullModalCard: {
    flex: 1,
  },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  fullModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  fullModalSubtitle: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  modalListContent: {
    padding: spacing.md,
  },
  resCard: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  resCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resMainInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  resTitleText: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  resDatesText: {
    fontSize: fontSize.xs + 1,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  resMetaText: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  resSideInfo: {
    alignItems: 'flex-end',
  },
  resAmountText: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.primary,
  },
  resBadge: {
    marginTop: 4,
  },
});
