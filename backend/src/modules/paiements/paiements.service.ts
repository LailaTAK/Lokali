// backend/src/modules/paiements/paiements.service.ts

import Stripe from 'stripe';
import { prisma } from '../../config/database';
import { pdfQueue } from '../../config/bullmq';
import { AppError } from '../../middlewares/error.middleware';
import { sendEmail } from '../../config/mailer';

// Instantiate Stripe client safely
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock_stripe_secret_key', {
  apiVersion: '2023-10-16' as any,
});

export interface PaymentInitiationResult {
  paiement: any;
  paymentDetails: {
    clientSecret?: string; // Stripe PaymentIntent
    waveUrl?: string;      // Wave link
    ussdCode?: string;     // Orange Money USSD code
  };
}

/**
 * Initiates a payment for a booking reservation.
 * Verifies that the reservation exists, is CONFIRMEE, and has not yet been paid.
 * 
 * @param {string} userId - The client ID requesting payment.
 * @param {any} data - Input args (reservationId, methode).
 * @returns {Promise<PaymentInitiationResult>} The created payment record and client details.
 * @throws {AppError} If reservation is invalid, already paid, or unauthorized.
 */
export async function initierPaiement(userId: string, data: any): Promise<PaymentInitiationResult> {
  const { reservationId, methode } = data;

  // 1. Fetch reservation
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      paiements: true,
      client: true,
    },
  });

  if (!reservation) {
    throw new AppError('Réservation introuvable.', 404);
  }

  // Validate owner identity
  if (reservation.clientId !== userId) {
    throw new AppError("Vous n'êtes pas autorisé à régler cette réservation.", 403);
  }

  // Check state: must be CONFIRMEE
  if (reservation.statut !== 'CONFIRMEE') {
    throw new AppError("La réservation doit être confirmée par l'hôte avant paiement.", 400);
  }

  // Check if already paid
  const alreadyPaid = reservation.paiements.some((p) => p.statut === 'PAYE');
  if (alreadyPaid) {
    throw new AppError('Cette réservation a déjà été payée.', 400);
  }

  let reference = '';
  const paymentDetails: any = {};

  // 2. Process transaction based on payment method
  if (methode === 'CARTE') {
    // Generate Stripe PaymentIntent
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(reservation.montantTotal * 100), // amount in cents
        currency: 'eur',
        metadata: {
          reservationId: reservation.id,
          clientId: userId,
        },
      });
      reference = paymentIntent.id;
      paymentDetails.clientSecret = paymentIntent.client_secret || undefined;
    } catch (stripeErr: any) {
      console.error('Stripe PaymentIntent Creation Failed:', stripeErr);
      throw new AppError(`Erreur d'initialisation de la carte bancaire : ${stripeErr.message}`, 500);
    }
  } else if (methode === 'WAVE') {
    // Simulate Wave Checkout session URL
    reference = `wave_ref_${Date.now()}`;
    paymentDetails.waveUrl = `https://checkout.wave.com/pay/${reference}`;
  } else if (methode === 'ORANGE_MONEY') {
    // Simulate Orange Money USSD code
    reference = `om_ref_${Date.now()}`;
    paymentDetails.ussdCode = `#144#39#${Math.round(reservation.montantTotal)}#`;
  } else {
    throw new AppError('Méthode de paiement invalide.', 400);
  }

  // 3. Register payment in database set to EN_ATTENTE
  const paiement = await prisma.paiement.create({
    data: {
      reservationId: reservation.id,
      amount: reservation.montantTotal,
      methode,
      statut: 'EN_ATTENTE',
      reference,
      meta: JSON.stringify(paymentDetails),
    },
  });

  return {
    paiement,
    paymentDetails,
  };
}

/**
 * Confirms a pending payment.
 * Transitions payment status to PAYE and triggers the PDF receipt generation via BullMQ.
 * 
 * @param {string} reference - The provider payment ID reference.
 * @param {string} provider - Payment gateway (STRIPE, WAVE, ORANGE_MONEY).
 * @returns {Promise<any>} The confirmed payment.
 */
export async function confirmerPaiement(reference: string, provider: string): Promise<any> {
  const paiement = await prisma.paiement.findFirst({
    where: { reference },
    include: {
      reservation: {
        include: {
          client: true,
          bien: { include: { loueur: true } },
        },
      },
    },
  });

  if (!paiement) {
    console.error(`❌ Payment confirmation failed: Payment reference not found: ${reference}`);
    throw new AppError('Paiement introuvable pour cette référence.', 404);
  }

  // If already confirmed, return it
  if (paiement.statut === 'PAYE') {
    return paiement;
  }

  // 1. Transition payment status to PAYE
  const updatedPaiement = await prisma.paiement.update({
    where: { id: paiement.id },
    data: { statut: 'PAYE' },
  });

  console.log(`✅ Payment reference ${reference} confirmed via ${provider}.`);

  // 2. Add asynchronous job to BullMQ pdfQueue for generating the receipt PDF
  try {
    await pdfQueue.add(
      'generate-receipt',
      {
        reservation: {
          id: paiement.reservation.id,
          bienTitle: paiement.reservation.bien.titre,
          checkIn: paiement.reservation.checkIn.toISOString().split('T')[0],
          checkOut: paiement.reservation.checkOut.toISOString().split('T')[0],
          nightsCount: paiement.reservation.nbNuits,
        },
        paiement: {
          id: paiement.id,
          amount: paiement.amount,
          paymentMethod: paiement.methode,
          createdAt: paiement.createdAt.toISOString(),
        },
        user: {
          id: paiement.reservation.client.id,
          name: `${paiement.reservation.client.prenom} ${paiement.reservation.client.nom}`,
          email: paiement.reservation.client.email,
        },
      },
      {
        jobId: `receipt:${paiement.id}`,
      }
    );
    console.log(`📥 Enqueued PDF receipt generation for payment #${paiement.id} on BullMQ.`);
  } catch (bullErr) {
    console.error('Failed to enqueue receipt PDF generation on BullMQ:', bullErr);
  }

  // 3. Create client app notification alert
  await prisma.alerte.create({
    data: {
      userId: paiement.reservation.clientId,
      type: 'RESERVATION',
      message: `Votre paiement de ${paiement.amount} € a été validé ! Votre reçu PDF est en cours de création.`,
      lu: false,
    },
  });

  return updatedPaiement;
}

/**
 * Refunds a payment transaction.
 * Calls Stripe API to trigger refund if payment was made via credit card.
 * 
 * @param {string} paiementId - ID of the payment.
 * @param {string} adminId - ID of the moderating administrator.
 * @returns {Promise<any>} Updated payment record.
 * @throws {AppError} If payment does not exist or is not settled.
 */
export async function rembourser(paiementId: string, adminId: string): Promise<any> {
  const paiement = await prisma.paiement.findUnique({
    where: { id: paiementId },
    include: {
      reservation: {
        include: {
          client: true,
        },
      },
    },
  });

  if (!paiement) {
    throw new AppError('Paiement introuvable.', 404);
  }

  if (paiement.statut !== 'PAYE') {
    throw new AppError('Seuls les paiements validés (PAYE) peuvent être remboursés.', 400);
  }

  // 1. Call provider Refund APIs
  if (paiement.methode === 'CARTE') {
    try {
      await stripe.refunds.create({
        payment_intent: paiement.reference,
      });
      console.log(`Stripe refund successful for PaymentIntent: ${paiement.reference}`);
    } catch (stripeErr: any) {
      console.error('Stripe Refund API error:', stripeErr);
      throw new AppError(`Erreur API Stripe de remboursement : ${stripeErr.message}`, 500);
    }
  } else {
    // Wave/Orange Money simulated cloud refunds
    console.log(`Simulated mobile refund processed on gateway for transaction ref: ${paiement.reference}`);
  }

  // 2. Set database state to REMBOURSE
  const updatedPaiement = await prisma.paiement.update({
    where: { id: paiementId },
    data: { statut: 'REMBOURSE' },
  });

  // 3. Notify client via database alert
  await prisma.alerte.create({
    data: {
      userId: paiement.reservation.clientId,
      type: 'RESERVATION',
      message: `Votre paiement de ${paiement.amount} € pour la réservation #${paiement.reservationId} a été remboursé.`,
      lu: false,
    },
  });

  return updatedPaiement;
}

/**
 * Returns detailed payment by ID. Checks credentials.
 */
export async function getPaiementById(id: string, userId: string, role: string): Promise<any> {
  const paiement = await prisma.paiement.findUnique({
    where: { id },
    include: {
      reservation: {
        include: {
          client: true,
          bien: true,
        },
      },
    },
  });

  if (!paiement) {
    throw new AppError('Paiement introuvable.', 404);
  }

  const isClient = paiement.reservation.clientId === userId;
  const isHost = paiement.reservation.bien.loueurId === userId;
  const isAdmin = role === 'ADMINISTRATEUR';

  if (!isClient && !isHost && !isAdmin) {
    throw new AppError("Vous n'êtes pas autorisé à consulter ce paiement.", 403);
  }

  return paiement;
}

/**
 * Lists all payments matching filters.
 */
export async function getPaiementsByUser(userId: string, role: string): Promise<any[]> {
  const where: any = {};

  if (role === 'CLIENT') {
    where.reservation = { clientId: userId };
  } else if (role === 'LOUEUR') {
    where.reservation = { bien: { loueurId: userId } };
  }
  // Admin role sees all payments

  return await prisma.paiement.findMany({
    where,
    include: {
      reservation: {
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          bien: { select: { titre: true, ville: true } },
          client: { select: { nom: true, prenom: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// FICHIER SUIVANT : backend/src/modules/paiements/paiements.webhook.ts
