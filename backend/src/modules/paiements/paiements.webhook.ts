// backend/src/modules/paiements/paiements.webhook.ts

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import { confirmerPaiement } from './paiements.service';
import { logger } from '../../utils/logger';

// Instantiate Stripe client safely
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock_stripe_secret_key', {
  apiVersion: '2023-10-16' as any,
});

/**
 * Express Controller: Stripe webhook endpoint.
 * Validates the request signature using the Stripe SDK and raw request body.
 * Responds 200 OK on success.
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    logger.error('❌ Missing stripe-signature header or STRIPE_WEBHOOK_SECRET config.');
    res.status(400).send('Webhook verification parameters missing.');
    return;
  }

  let event: Stripe.Event;

  try {
    // req.body must be the RAW buffer for signature verification
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body);
    event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);
  } catch (err: any) {
    logger.error(`❌ Stripe Webhook Signature Verification Failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    // Handle specific event type
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logger.info(`Stripe payment_intent.succeeded event received: ${paymentIntent.id}`);
      
      // Confirm the payment
      await confirmerPaiement(paymentIntent.id, 'STRIPE');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error handling Stripe webhook event:', error);
    next(error);
  }
}

/**
 * Express Controller: Wave webhook endpoint.
 * Verifies Wave HMAC SHA256 signature using the raw request body.
 * Responds 200 OK on success.
 */
export async function handleWaveWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const waveSignature = req.headers['wave-signature'] as string;
  const webhookSecret = process.env.WAVE_WEBHOOK_SECRET || 'wave_secret_key';

  if (!waveSignature) {
    logger.error('❌ Missing wave-signature header.');
    res.status(400).send('Wave signature header missing.');
    return;
  }

  try {
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body);
    
    // Compute HMAC SHA256 signature of raw body
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const a = Buffer.from(waveSignature);
    const b = Buffer.from(computedSignature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      logger.error('❌ Wave Webhook signature verification mismatch.');
      res.status(400).send('Invalid Wave signature.');
      return;
    }

    const payload = JSON.parse(rawBody.toString());
    
    if (payload.type === 'checkout.session.completed') {
      logger.info(`Wave checkout.session.completed received: ${payload.data.id}`);
      await confirmerPaiement(payload.data.id, 'WAVE');
    }

    res.status(200).send('Received');
  } catch (error) {
    logger.error('Error handling Wave webhook:', error);
    next(error);
  }
}

/**
 * Express Controller: Orange Money webhook endpoint.
 * Verifies standard notification token validation query/header.
 * Responds 200 OK on success.
 */
export async function handleOrangeMoneyWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers['x-om-token'] || req.query.token;
  const expectedToken = process.env.ORANGE_MONEY_WEBHOOK_TOKEN || 'om_token_key';

  if (token !== expectedToken) {
    logger.error('❌ Orange Money Webhook token validation failed.');
    res.status(401).send('Unauthorized. Invalid token.');
    return;
  }

  try {
    const payload = req.body;
    logger.info(`Orange Money notification received for transaction: ${payload.txnid}`);

    if (payload.status === 'SUCCESS') {
      await confirmerPaiement(payload.txnid, 'ORANGE_MONEY');
    } else {
      logger.warn(`Orange Money notification reported non-success status: ${payload.status}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error handling Orange Money webhook:', error);
    next(error);
  }
}

// FICHIER SUIVANT : backend/src/modules/paiements/paiements.controller.ts
