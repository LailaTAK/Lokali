// backend/src/test-paiements.ts

import { initierPaiementSchema, webhookWaveSchema, webhookOrangeMoneySchema } from './modules/paiements/paiements.schema';
import { initierPaiement, confirmerPaiement, rembourser, getPaiementById, getPaiementsByUser } from './modules/paiements/paiements.service';
import { handleStripeWebhook, handleWaveWebhook, handleOrangeMoneyWebhook } from './modules/paiements/paiements.webhook';
import { initierPaiementController, rembourserController, getPaiementByIdController, getPaiementsByUserController } from './modules/paiements/paiements.controller';
import { paiementsRouter } from './modules/paiements/paiements.routes';

console.log('Testing paiements module files compile and load...');
console.log({
  initierPaiementSchemaExists: typeof initierPaiementSchema !== 'undefined',
  initierPaiementExists: typeof initierPaiement !== 'undefined',
  handleStripeWebhookExists: typeof handleStripeWebhook !== 'undefined',
  initierPaiementControllerExists: typeof initierPaiementController !== 'undefined',
  paiementsRouterExists: typeof paiementsRouter !== 'undefined',
});
