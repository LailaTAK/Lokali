// mobile/src/hooks/useSocket.ts

import { useEffect, useRef } from 'react';
import { useMessagesStore } from '../stores/messages.store';
import { useAuthStore } from '../stores/auth.store';

/**
 * Hook to manage Socket.io lifecycle, real-time message relays, and typing indicators.
 */
export function useSocket() {
  const {
    isConnected,
    isTyping,
    connectSocket,
    disconnectSocket,
    sendMessage,
    sendTypingIndicator,
  } = useMessagesStore();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Clear any pending disconnect timeouts
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      
      // Establish WebSocket connection
      connectSocket().catch((err) => {
        console.error('Failed to connect socket on hook mount:', err);
      });
    }

    // Delayed disconnection on unmount to prevent rapid reconnects during screen transitions
    return () => {
      disconnectTimeoutRef.current = setTimeout(() => {
        disconnectSocket();
      }, 5000); // 5 seconds delay before cutting connection
    };
  }, [isAuthenticated, connectSocket, disconnectSocket]);

  return {
    isConnected,
    isTyping, // typing state of the active contact we are chatting with
    sendMessage,
    sendTypingIndicator,
  };
}

// FICHIER SUIVANT : mobile/src/hooks/useLocation.ts
