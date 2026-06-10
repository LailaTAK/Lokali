// mobile/src/api/messages.api.ts

import { client } from './client';
import { ENDPOINTS } from '../constants/api';
import { Conversation, Message, PaginatedResponse } from '../types/models';

export interface SendMessagePayload {
  destinataireId: string;
  contenu: string;
}

export interface GetConversationParams {
  page?: number;
  limit?: number;
}

/**
 * Retrieves a list of active chat conversations for the user.
 * 
 * @returns {Promise<Conversation[]>} List of conversations.
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await client.get<Conversation[]>(ENDPOINTS.messagerie.conversations);
  return response.data;
}

/**
 * Retrieves paginated messages history exchange between the user and a contact.
 * 
 * @param {string} userId - The contact's user ID.
 * @param {GetConversationParams} [params] - Pagination parameters.
 * @returns {Promise<PaginatedResponse<Message>>} Paginated list of messages.
 */
export async function getConversation(
  userId: string,
  params?: GetConversationParams
): Promise<PaginatedResponse<Message>> {
  const response = await client.get<PaginatedResponse<Message>>(ENDPOINTS.messagerie.messages(userId), { params });
  return response.data;
}

/**
 * Sends a chat message to a recipient.
 * 
 * @param {SendMessagePayload} payload - Recipient ID and text content.
 * @returns {Promise<Message>} The sent message.
 */
export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  const response = await client.post<Message>(`/messages`, payload);
  return response.data;
}

/**
 * Marks messages from a contact to the current user as read.
 * 
 * @param {string} senderId - Contact's user ID.
 * @returns {Promise<void>}
 */
export async function marquerLu(senderId: string): Promise<void> {
  await client.patch(`/messages/${senderId}/lu`);
}

/**
 * Counts the total number of unread incoming messages for the user.
 * 
 * @returns {Promise<number>} Unread messages count.
 */
export async function getNombreNonLus(): Promise<number> {
  const response = await client.get<{ count: number }>(ENDPOINTS.messagerie.unread);
  return response.data.count;
}

// FICHIER SUIVANT : mobile/src/stores/auth.store.ts
