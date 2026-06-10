// backend/src/modules/messagerie/messagerie.gateway.ts

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { sendMessage, marquerLu } from './messagerie.service';
import { logger } from '../../utils/logger';

/**
 * Interface representing the payload structure for typing indicator events.
 */
interface TypingPayload {
  destinataireId: string;
  isTyping: boolean;
}

/**
 * Interface representing the payload structure for incoming message events.
 */
interface MessagePayload {
  destinataireId: string;
  contenu: string;
}

/**
 * Sets up the Socket.io real-time chat gateway under the `/chat` namespace.
 * Enforces authentication during the handshake phase using JWT access tokens.
 * 
 * @param {Server} io - The root Socket.io Server instance.
 */
export function setupChatGateway(io: Server): void {
  const chatNamespace = io.of('/chat');

  // Handshake authentication middleware
  chatNamespace.use((socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
      
      if (!authHeader) {
        return next(new Error('Authentication error. Token missing in handshake connection.'));
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;

      if (!decoded || !decoded.id) {
        return next(new Error('Authentication error. Invalid token payload.'));
      }

      // Attach decoded user information to socket data space
      socket.data.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (err) {
      return next(new Error('Authentication error. Connection token expired or invalid.'));
    }
  });

  // Client connection handler
  chatNamespace.on('connection', async (socket: Socket) => {
    const userId = socket.data.user.id;
    logger.info(`🔌 Real-time client connected to /chat namespace: User ID: ${userId}, Socket ID: ${socket.id}`);

    // Register user's active socket mapping in Redis
    try {
      await redis.set(`socket:chat:${userId}`, socket.id);
    } catch (redisErr) {
      logger.error('Failed to map user socket ID in Redis:', redisErr);
    }

    // Automatically join the user to their own private room named after their ID
    socket.join(userId);

    /**
     * Event: join
     * Enables explicit subscription of the client to custom channel rooms.
     */
    socket.on('join', (room: string) => {
      socket.join(room);
      logger.info(`Socket client ${socket.id} (User: ${userId}) joined room: ${room}`);
    });

    /**
     * Event: typing
     * Relays typing state indicators to the recipient's room.
     */
    socket.on('typing', (data: TypingPayload) => {
      chatNamespace.to(data.destinataireId).emit('typing', {
        expediteurId: userId,
        isTyping: data.isTyping,
      });
    });

    /**
     * Event: read
     * Marks all messages from a contact as read, and broadcasts a read receipt.
     */
    socket.on('read', async (data: { contactId: string }) => {
      try {
        await marquerLu(userId, data.contactId);
        // Dispatch read status receipt directly to the sender's room
        chatNamespace.to(data.contactId).emit('message_read', {
          readerId: userId,
        });
      } catch (error) {
        logger.error(`Failed to process read event from socket ${socket.id}:`, error);
      }
    });

    /**
     * Event: message
     * Receives message contents, records it in the database, and routes it to the recipient.
     */
    socket.on('message', async (data: MessagePayload, callback?: (response: any) => void) => {
      try {
        if (!data.contenu || data.contenu.trim() === '') {
          throw new Error('Message content cannot be empty.');
        }

        // 1. Persist the message in PostgreSQL database
        const message = await sendMessage(userId, data.destinataireId, data.contenu);

        // 2. Broadcast message payload to the recipient's room
        chatNamespace.to(data.destinataireId).emit('message', message);

        // 3. Acknowledge transaction success to sender client
        if (callback) {
          callback({ success: true, data: message });
        }
      } catch (error: any) {
        logger.error(`Failed to handle message relay over socket for user ${userId}:`, error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Client disconnection handler
    socket.on('disconnect', async () => {
      logger.info(`🔌 Real-time client disconnected from /chat: Socket ID: ${socket.id}`);
      try {
        // Evict mapping from Redis only if it matches this socket instance
        const mappedSocketId = await redis.get(`socket:chat:${userId}`);
        if (mappedSocketId === socket.id) {
          await redis.del(`socket:chat:${userId}`);
        }
      } catch (redisErr) {
        logger.error('Failed to clean up socket mapping in Redis on disconnect:', redisErr);
      }
    });
  });
}

// FICHIER SUIVANT : backend/src/modules/messagerie/messagerie.routes.ts
