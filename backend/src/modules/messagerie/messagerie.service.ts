// backend/src/modules/messagerie/messagerie.service.ts

import { prisma } from '../../config/database';
import { getSignedUrl } from '../../config/storage';
import { AppError } from '../../middlewares/error.middleware';
import { parsePagination, buildPaginatedResponse, PaginatedResponse } from '../../utils/pagination';

export interface ConversationItem {
  contact: {
    id: string;
    nom: string;
    prenom: string;
    photo: string | null;
    photoUrl: string | null;
  };
  lastMessage: {
    id: string;
    expediteurId: string;
    destinataireId: string;
    contenu: string;
    lu: boolean;
    createdAt: Date;
  };
  unreadCount: number;
}

/**
 * Sends a chat message.
 * Verifies that the recipient exists and that the sender and recipient
 * share at least one reservation (or pending booking request) to prevent spam.
 * 
 * @param {string} expediteurId - ID of the message sender.
 * @param {string} destinataireId - ID of the message recipient.
 * @param {string} contenu - Plain text message content.
 * @returns {Promise<any>} The created message.
 * @throws {AppError} If recipient not found or no common reservation exists.
 */
export async function sendMessage(
  expediteurId: string,
  destinataireId: string,
  contenu: string
): Promise<any> {
  if (expediteurId === destinataireId) {
    throw new AppError("Vous ne pouvez pas vous envoyer de message à vous-même.", 400);
  }

  // 1. Verify recipient exists
  const destinataire = await prisma.user.findUnique({
    where: { id: destinataireId },
  });

  if (!destinataire) {
    throw new AppError('Destinataire introuvable.', 404);
  }

  // 2. Enforce structural link: common booking or booking request
  const commonReservation = await prisma.reservation.findFirst({
    where: {
      OR: [
        { clientId: expediteurId, bien: { loueurId: destinataireId } },
        { clientId: destinataireId, bien: { loueurId: expediteurId } },
      ],
    },
  });

  if (!commonReservation) {
    throw new AppError(
      "Envoi interdit. Vous devez partager une réservation (active ou en attente) avec cet utilisateur pour ouvrir une discussion.",
      403
    );
  }

  // 3. Save message in database (defaults lu to false)
  const message = await prisma.message.create({
    data: {
      expediteurId,
      destinataireId,
      contenu,
      lu: false,
    },
  });

  return message;
}

/**
 * Retrieves a paginated list of chat messages between two users.
 * Automatically marks all incoming messages from the contact as read.
 * 
 * @param {string} userId - ID of the user requesting.
 * @param {string} contactId - ID of the other participant.
 * @param {any} queryParams - Page and limit filters.
 * @returns {Promise<PaginatedResponse<any>>} The paginated message history.
 */
export async function getConversation(
  userId: string,
  contactId: string,
  queryParams: any
): Promise<PaginatedResponse<any>> {
  const { page, limit, skip } = parsePagination({ page: queryParams.page, limit: queryParams.limit });

  // 1. Query matching messages
  const where = {
    OR: [
      { expediteurId: userId, destinataireId: contactId },
      { expediteurId: contactId, destinataireId: userId },
    ],
  };

  const total = await prisma.message.count({ where });
  const messages = await prisma.message.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' }, // newest first
  });

  // 2. Automatically mark unread incoming messages from the contact as read
  await prisma.message.updateMany({
    where: {
      expediteurId: contactId,
      destinataireId: userId,
      lu: false,
    },
    data: { lu: true },
  });

  // Note: For convenience in mobile clients, reverse history array to present chronological order
  return buildPaginatedResponse(messages.reverse(), total, page, limit);
}

/**
 * Compiles a list of conversations for a user.
 * Groups messages, identifies the last message exchange, counts unread records,
 * and attaches contact details (including resolved S3 photos).
 * 
 * @param {string} userId - ID of the authenticated user.
 * @returns {Promise<ConversationItem[]>} Aggregated list of active conversations.
 */
export async function getConversations(userId: string): Promise<ConversationItem[]> {
  // Retrieve all messages involving the user, sorted newest first
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ expediteurId: userId }, { destinataireId: userId }],
    },
    orderBy: { createdAt: 'desc' },
  });

  const conversationMap = new Map<string, { lastMessage: any; unreadCount: number }>();

  // Aggregate message records by other contact participant
  for (const msg of messages) {
    const otherId = msg.expediteurId === userId ? msg.destinataireId : msg.expediteurId;

    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, {
        lastMessage: msg,
        unreadCount: 0,
      });
    }

    // Increment count if message is unread and addressed to the user
    if (msg.destinataireId === userId && !msg.lu) {
      const entry = conversationMap.get(otherId)!;
      entry.unreadCount += 1;
    }
  }

  const results: ConversationItem[] = [];

  // Hydrate details for other participants
  for (const [otherId, data] of conversationMap.entries()) {
    const otherUser = await prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true, nom: true, prenom: true, photo: true },
    });

    if (otherUser) {
      let photoUrl = null;
      if (otherUser.photo) {
        photoUrl = otherUser.photo.startsWith('http')
          ? otherUser.photo
          : await getSignedUrl(otherUser.photo);
      }

      results.push({
        contact: {
          id: otherUser.id,
          nom: otherUser.nom,
          prenom: otherUser.prenom,
          photo: otherUser.photo,
          photoUrl,
        },
        lastMessage: data.lastMessage,
        unreadCount: data.unreadCount,
      });
    }
  }

  return results;
}

/**
 * Marks all messages from a contact to the current user as read.
 * 
 * @param {string} destinataireId - User ID receiving.
 * @param {string} expediteurId - Contact ID sending.
 * @returns {Promise<void>}
 */
export async function marquerLu(destinataireId: string, expediteurId: string): Promise<void> {
  await prisma.message.updateMany({
    where: {
      expediteurId,
      destinataireId,
      lu: false,
    },
    data: { lu: true },
  });
}

/**
 * Counts the total number of unread incoming messages for a user.
 * Used for building push badges or bottom navigation badges.
 * 
 * @param {string} userId - User ID.
 * @returns {Promise<number>} Number of unread messages.
 */
export async function getNombreNonLus(userId: string): Promise<number> {
  return await prisma.message.count({
    where: {
      destinataireId: userId,
      lu: false,
    },
  });
}

// FICHIER SUIVANT : backend/src/modules/messagerie/messagerie.gateway.ts
