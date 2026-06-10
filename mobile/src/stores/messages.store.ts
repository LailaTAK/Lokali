// mobile/src/stores/messages.store.ts

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Conversation, Message } from '../types/models';
import * as messagesApi from '../api/messages.api';
import { BASE_URL } from '../constants/api';
import { tokenStorage } from '../api/client';

export interface MessagesState {
  conversations: Conversation[];
  messagesCourants: Message[];
  nombreNonLus: number;
  activeContactId: string | null;
  isConnected: boolean;
  isTyping: boolean;
  isLoading: boolean;

  fetchConversations: () => Promise<void>;
  fetchMessages: (contactId: string) => Promise<void>;
  sendMessage: (destinataireId: string, contenu: string) => Promise<void>;
  marquerLu: (contactId: string) => Promise<void>;
  receiveMessage: (message: Message) => void;
  setTyping: (isTyping: boolean) => void;
  
  // Real-time socket actions
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;
  sendTypingIndicator: (destinataireId: string, isTyping: boolean) => void;
}

let socket: Socket | null = null;

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messagesCourants: [],
  nombreNonLus: 0,
  activeContactId: null,
  isConnected: false,
  isTyping: false,
  isLoading: false,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const list = await messagesApi.getConversations();
      const count = await messagesApi.getNombreNonLus();
      set({ conversations: list, nombreNonLus: count });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (contactId: string) => {
    set({ isLoading: true, activeContactId: contactId });
    try {
      const response = await messagesApi.getConversation(contactId, { page: 1, limit: 50 });
      set({ messagesCourants: response.data });
      
      // Auto-read messages from this contact
      await get().marquerLu(contactId);
    } catch (error) {
      console.error(`Failed to fetch messages for contact ${contactId}:`, error);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (destinataireId, contenu) => {
    try {
      // 1. Send via WebSocket if socket is connected, fallback to API
      if (socket && socket.connected) {
        socket.emit('message', { destinataireId, contenu }, (ack: any) => {
          if (ack && ack.success) {
            const sentMsg = ack.data;
            set((state) => ({
              messagesCourants: [...state.messagesCourants, sentMsg],
            }));
            get().fetchConversations(); // refresh list
          }
        });
      } else {
        // Fallback rest API
        const sentMsg = await messagesApi.sendMessage({ destinataireId, contenu });
        set((state) => ({
          messagesCourants: [...state.messagesCourants, sentMsg],
        }));
        get().fetchConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  marquerLu: async (contactId) => {
    try {
      // Invalidate on backend
      await messagesApi.marquerLu(contactId);
      
      // Notify via Socket
      if (socket && socket.connected) {
        socket.emit('read', { contactId });
      }

      // Update local state
      set((state) => {
        const updatedConvs = state.conversations.map((c) => {
          if (c.contact.id === contactId) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        });

        // Recalculate global unread count
        const newUnreadCount = updatedConvs.reduce((acc, c) => acc + c.unreadCount, 0);

        return {
          conversations: updatedConvs,
          nombreNonLus: newUnreadCount,
        };
      });
    } catch (error) {
      console.error(`Failed to mark conversation read for contact ${contactId}:`, error);
    }
  },

  receiveMessage: (message) => {
    const activeContact = get().activeContactId;
    
    // Check if the received message belongs to the open discussion screen
    if (activeContact === message.expediteurId || activeContact === message.destinataireId) {
      set((state) => ({
        messagesCourants: [...state.messagesCourants, message],
      }));
      // Mark read since we are actively viewing it
      if (message.expediteurId === activeContact) {
        get().marquerLu(activeContact);
      }
    } else {
      // Message from another conversation, increment global and local unread counts
      set((state) => ({
        nombreNonLus: state.nombreNonLus + 1,
      }));
      get().fetchConversations();
    }
  },

  setTyping: (isTyping) => {
    set({ isTyping });
  },

  connectSocket: async () => {
    // Prevent duplicate connections
    if (socket && socket.connected) return;

    const token = await tokenStorage.getAccessToken();
    if (!token) return;

    // Resolve socket server root url (strip /api suffix if present)
    const socketServerUrl = BASE_URL.endsWith('/api') ? BASE_URL.substring(0, BASE_URL.length - 4) : BASE_URL;

    socket = io(`${socketServerUrl}/chat`, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      console.log('⚡ Socket.io connected to /chat namespace.');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('🔌 Socket.io disconnected.');
    });

    socket.on('message', (message: Message) => {
      get().receiveMessage(message);
    });

    socket.on('typing', (data: { expediteurId: string; isTyping: boolean }) => {
      if (get().activeContactId === data.expediteurId) {
        set({ isTyping: data.isTyping });
      }
    });

    socket.on('message_read', (data: { readerId: string }) => {
      if (get().activeContactId === data.readerId) {
        set((state) => ({
          messagesCourants: state.messagesCourants.map((msg) =>
            msg.destinataireId === data.readerId ? { ...msg, lu: true } : msg
          ),
        }));
      }
    });
  },

  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      set({ isConnected: false });
    }
  },

  sendTypingIndicator: (destinataireId, isTyping) => {
    if (socket && socket.connected) {
      socket.emit('typing', { destinataireId, isTyping });
    }
  },
}));
