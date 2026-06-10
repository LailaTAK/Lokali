// backend/src/test-messagerie.ts

import { sendMessage, getConversation, getConversations, marquerLu, getNombreNonLus } from './modules/messagerie/messagerie.service';
import { setupChatGateway } from './modules/messagerie/messagerie.gateway';
import { messagerieRouter } from './modules/messagerie/messagerie.routes';

console.log('Testing messagerie module files compile and load...');
console.log({
  sendMessageExists: typeof sendMessage !== 'undefined',
  setupChatGatewayExists: typeof setupChatGateway !== 'undefined',
  messagerieRouterExists: typeof messagerieRouter !== 'undefined',
});
