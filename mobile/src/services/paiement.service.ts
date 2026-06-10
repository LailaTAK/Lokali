// mobile/src/services/paiement.service.ts

import { Linking } from 'react-native';
import { getPaiementById } from '../api/paiements.api';
import { Paiement } from '../types/models';

/**
 * Service to orchestrate mobile money checkouts and status synchronization.
 */
export const paiementService = {
  /**
   * Generates checkout web redirection links or registers custom URL schemes for Wave.
   * 
   * @param {number} montant - Amount.
   * @param {string} ref - Payment transaction reference.
   * @returns {string} Target deep link URL.
   */
  initierWave(montant: number, ref: string): string {
    // Wave checkout web URL structure or custom deep link
    const waveRedirectionUrl = `https://checkout.wave.com/pay/${ref}?amount=${montant}&c=eur`;
    return waveRedirectionUrl;
  },

  /**
   * Generates Orange Money deep links or USSD launch shortcuts.
   * 
   * @param {number} montant - Amount.
   * @param {string} merchantCode - Merchant code identifier.
   * @returns {string} Target deep link or USSD string.
   */
  initierOrangeMoney(montant: number, merchantCode: string): string {
    // Format USSD launch scheme if on phone dialer, or checkout URL fallback
    const ussdShortcut = `tel:#144#39#${montant}#${merchantCode}#`;
    return ussdShortcut;
  },

  /**
   * Opens the checkout link on the mobile device.
   * 
   * @param {string} url - Deep link or web checkout URL.
   */
  async openCheckoutLink(url: string): Promise<void> {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      throw new Error(`Impossible d'ouvrir le lien de paiement : ${url}`);
    }
  },

  /**
   * Polls the backend payment status endpoint every 3 seconds for up to 2 minutes
   * until transaction settles as PAYE or errors out.
   * 
   * @param {string} paiementId - Payment record ID.
   * @returns {Promise<Paiement>} Settled payment transaction record.
   * @throws {Error} If transaction fails, is refunded, or timeout is reached.
   */
  async verifierStatut(paiementId: string): Promise<Paiement> {
    const intervalMs = 3000;
    const maxAttempts = 40; // 40 attempts * 3 seconds = 120 seconds (2 minutes)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const paiement = await getPaiementById(paiementId);

        if (paiement.statut === 'PAYE') {
          return paiement;
        }

        if (paiement.statut === 'REMBOURSE') {
          throw new Error('Paiement rejeté car la transaction a été remboursée.');
        }

        // Log progress debug
        console.log(`Polling status of payment ${paiementId}: Attempt ${attempt + 1}/${maxAttempts} - Current: ${paiement.statut}`);
      } catch (err: any) {
        // If error is raised by the status check logic, propagate it
        if (err.message?.includes('remboursée')) {
          throw err;
        }
        console.warn(`Attempt ${attempt + 1} checking status failed:`, err.message);
      }

      // Wait 3 seconds before next query request
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Le délai d\'attente de confirmation de paiement (2 minutes) a été dépassé.');
  },
};
