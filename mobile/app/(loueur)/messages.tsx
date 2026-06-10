// mobile/app/(loueur)/messages.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessagesStore } from '../../src/stores/messages.store';
import { useSocket } from '../../src/hooks/useSocket';
import { useAuthStore } from '../../src/stores/auth.store';
import { Avatar } from '../../src/components/Avatar';
import { colors } from '../../src/constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../src/constants/spacing';
import { Conversation, Message } from '../../src/types/models';

/**
 * Chat Messaging Screen for Hosts (identical to client chat).
 */
export default function HostMessagesScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const {
    conversations,
    messagesCourants,
    isLoading,
    activeContactId,
    fetchConversations,
    fetchMessages,
    sendMessage,
    sendTypingIndicator,
    isTyping,
    marquerLu,
  } = useMessagesStore();

  const { isConnected } = useSocket();

  // Local state toggler
  const [selectedContact, setSelectedContact] = useState<{ id: string; nom: string; prenom: string; photoUrl: string | null } | null>(null);
  const [text, setText] = useState('');
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Poll conversation list periodically if socket fails
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        fetchConversations();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  // Entering a conversation discussion details
  const handleSelectConversation = async (conv: Conversation) => {
    const contact = {
      id: conv.contact.id,
      nom: conv.contact.nom,
      prenom: conv.contact.prenom,
      photoUrl: conv.contact.photoUrl,
    };
    setSelectedContact(contact);
    await fetchMessages(conv.contact.id);
  };

  // Exiting conversation detail screen
  const handleBackToList = () => {
    setSelectedContact(null);
    useMessagesStore.setState({ activeContactId: null, messagesCourants: [] });
    fetchConversations(); // refresh unread badges
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedContact) return;
    const body = text.trim();
    setText(''); // clear input instantly for native speed feel
    
    // Stop typing indicator
    sendTypingIndicator(selectedContact.id, false);

    try {
      await sendMessage(selectedContact.id, body);
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    }
  };

  const handleTextInputChange = (val: string) => {
    setText(val);
    if (selectedContact) {
      // Broadcast typing indicator if user is typing
      sendTypingIndicator(selectedContact.id, val.length > 0);
    }
  };

  // --- SUB-VIEW: CONVERSATIONS INDEX LIST ---
  const renderConversationsList = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Messages reçus</Text>
          {isConnected && (
            <View style={styles.socketStatusRow}>
              <View style={styles.socketDotConnected} />
              <Text style={styles.socketStatusText}>En direct</Text>
            </View>
          )}
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.contact.id}
          onRefresh={fetchConversations}
          refreshing={isLoading && conversations.length > 0}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.palette.gray[300]} />
                <Text style={styles.emptyText}>Aucune discussion ouverte.</Text>
                <Text style={styles.emptySub}>Les locataires intéressés par vos biens apparaîtront ici.</Text>
              </View>
            ) : (
              <ActivityIndicator size="small" color={colors.light.primary} style={{ marginTop: 40 }} />
            )
          }
          renderItem={({ item }) => {
            const hasUnread = item.unreadCount > 0;
            const lastMsgDate = new Date(item.lastMessage.createdAt).toLocaleDateString('fr-FR');

            return (
              <Pressable
                onPress={() => handleSelectConversation(item)}
                style={styles.convItem}
              >
                <Avatar
                  uri={item.contact.photoUrl}
                  nom={item.contact.nom}
                  prenom={item.contact.prenom}
                  size="md"
                />
                
                <View style={styles.convDetails}>
                  <View style={styles.convHeader}>
                    <Text style={styles.contactName}>
                      {item.contact.prenom} {item.contact.nom}
                    </Text>
                    <Text style={styles.convDate}>{lastMsgDate}</Text>
                  </View>
                  <View style={styles.convBody}>
                    <Text numberOfLines={1} style={[styles.lastMsgText, hasUnread && styles.lastMsgUnread]}>
                      {item.lastMessage.contenu}
                    </Text>
                    {hasUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    );
  };

  // --- SUB-VIEW: CHAT LOG MESSAGES HISTORY ---
  const renderChatDetail = () => {
    if (!selectedContact) return null;

    // We list newest first and use inverted FlatList (scrolls up)
    const reversedMessages = [...messagesCourants].reverse();

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        {/* Chat Header */}
        <View style={styles.chatHeaderBar}>
          <Pressable onPress={handleBackToList} style={styles.backButton} hitSlop={15}>
            <Ionicons name="arrow-back" size={24} color={colors.light.text} />
          </Pressable>
          
          <Avatar
            uri={selectedContact.photoUrl}
            nom={selectedContact.nom}
            prenom={selectedContact.prenom}
            size="sm"
            style={styles.chatHeaderAvatar}
          />
          <Text style={styles.chatHeaderName}>
            {selectedContact.prenom} {selectedContact.nom}
          </Text>
        </View>

        {/* Message Logs */}
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          inverted={true}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatListContent}
          renderItem={({ item }) => {
            const isMe = item.expediteurId === currentUser?.id;
            return (
              <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                    {item.contenu}
                  </Text>
                </View>
                <Text style={styles.bubbleDate}>
                  {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />

        {/* Typing and Input footer */}
        <View style={styles.chatFooter}>
          {isTyping && (
            <View style={styles.typingIndicatorRow}>
              <Text style={styles.typingText}>Le locataire écrit...</Text>
            </View>
          )}

          <View style={styles.inputContainerRow}>
            <TextInput
              ref={textInputRef}
              placeholder="Écrire un message..."
              placeholderTextColor={colors.light.placeholder}
              style={styles.chatTextInput}
              value={text}
              onChangeText={handleTextInputChange}
              multiline={true}
            />
            <Pressable
              disabled={!text.trim()}
              onPress={handleSend}
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            >
              <Ionicons name="send" size={18} color={colors.palette.white} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {selectedContact ? renderChatDetail() : renderConversationsList()}
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
  headerTitle: {
    fontSize: fontSize.md + 2,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  socketStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  socketDotConnected: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.light.success,
    marginRight: 4,
  },
  socketStatusText: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
    color: colors.light.success,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  convDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  convDate: {
    fontSize: fontSize.xs - 1,
    color: colors.light.textMuted,
  },
  convBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsgText: {
    fontSize: fontSize.sm,
    color: colors.light.textMuted,
    flex: 0.9,
  },
  lastMsgUnread: {
    color: colors.light.text,
    fontWeight: fontWeight.semibold,
  },
  unreadBadge: {
    backgroundColor: colors.light.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: colors.palette.white,
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.bold,
  },

  // CHAT DETAIL SUB-VIEW STYLES
  chatHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 52,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  backButton: {
    width: 40,
    height: 44,
    justifyContent: 'center',
  },
  chatHeaderAvatar: {
    marginRight: spacing.sm,
  },
  chatHeaderName: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.bold,
    color: colors.light.text,
  },
  chatListContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  bubbleWrapper: {
    marginVertical: spacing.xs,
    maxWidth: '80%',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: colors.light.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: colors.palette.gray[200],
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    fontSize: fontSize.sm + 1,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: colors.palette.white,
  },
  bubbleTextOther: {
    color: colors.light.text,
  },
  bubbleDate: {
    fontSize: fontSize.xs - 3,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  chatFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    backgroundColor: colors.light.surface,
    padding: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.sm,
  },
  typingIndicatorRow: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  typingText: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    fontStyle: 'italic',
  },
  inputContainerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  chatTextInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.palette.gray[100],
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: fontSize.sm,
    color: colors.light.text,
    textAlignVertical: 'center',
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.palette.gray[300],
  },
});
