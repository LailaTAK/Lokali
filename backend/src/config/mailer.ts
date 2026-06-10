// backend/src/config/mailer.ts

import sgMail from '@sendgrid/mail';
import { env } from './env';

// Initialize SendGrid client
sgMail.setApiKey(env.SENDGRID_API_KEY);

/**
 * Base function to send an email via SendGrid.
 * 
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML body content.
 * @param {string} [text] - The plain text fallback body content.
 * @returns {Promise<void>}
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const msg = {
    to,
    from: env.SENDGRID_FROM,
    subject,
    text: text || 'Veuillez ouvrir cet email dans un client compatible HTML.',
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`✉️ Email successfully sent to ${to} with subject: "${subject}"`);
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    if (error.response && error.response.body) {
      console.error('SendGrid error body:', JSON.stringify(error.response.body, null, 2));
    }
    throw new Error('Email sending service failed.');
  }
}

/**
 * Interface representing details for a reservation confirmation email.
 */
export interface ReservationDetails {
  reservationId: string;
  bienTitle: string;
  loueurName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
}

/**
 * Interface representing details for a payment reminder email.
 */
export interface PaymentDetails {
  userName: string;
  reservationId: string;
  amount: number;
  dueDate: string;
}

/**
 * Sends a welcome email to a newly registered user.
 * 
 * @param {string} to - The user's email address.
 * @param {string} userName - The name of the user.
 * @returns {Promise<void>}
 */
export async function sendWelcomeEmail(to: string, userName: string): Promise<void> {
  const subject = 'Bienvenue chez LOKALI ! 🏠';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Bienvenue sur LOKALI</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7fafc; color: #2d3748; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
          .header { text-align: center; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #3182ce; letter-spacing: 1px; }
          .content { padding-top: 30px; line-height: 1.6; }
          .button-container { text-align: center; margin-top: 35px; }
          .button { background-color: #3182ce; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">LOKALI</span>
          </div>
          <div class="content">
            <p>Bonjour <strong>${userName}</strong>,</p>
            <p>Nous sommes ravis de vous accueillir sur LOKALI, la plateforme premium de gestion et de réservation de locations immobilières.</p>
            <p>Que vous soyez à la recherche de votre prochain lieu de vacances, d'un logement temporaire ou que vous souhaitiez mettre vos propres biens en location, LOKALI met à votre disposition tous les outils nécessaires pour une expérience simple, fluide et sécurisée.</p>
            <div class="button-container">
              <a href="#" class="button">Découvrir la plateforme</a>
            </div>
            <p>Si vous avez des questions, notre équipe support est à votre entière disposition.</p>
            <p>À très bientôt,<br>L'équipe LOKALI</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} LOKALI. Tous droits réservés.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(to, subject, html);
}

/**
 * Sends a reservation confirmation email to the client.
 * 
 * @param {string} to - The client's email address.
 * @param {ReservationDetails} details - The reservation specifics.
 * @returns {Promise<void>}
 */
export async function sendReservationConfirmationEmail(
  to: string,
  details: ReservationDetails
): Promise<void> {
  const subject = `Confirmation de votre réservation #${details.reservationId} 📄`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmation de réservation</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7fafc; color: #2d3748; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
          .header { text-align: center; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #38a169; letter-spacing: 1px; }
          .content { padding-top: 30px; line-height: 1.6; }
          .details-card { background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .details-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #edf2f7; padding-bottom: 8px; }
          .details-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .details-label { font-weight: bold; color: #4a5568; }
          .details-value { color: #2d3748; }
          .total { font-size: 18px; font-weight: bold; color: #2f855a; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">LOKALI</span>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Votre réservation a été confirmée avec succès par le loueur ! Retrouvez ci-dessous le récapitulatif de votre séjour :</p>
            
            <div class="details-card">
              <div class="details-row">
                <span class="details-label">Numéro de réservation :</span>
                <span class="details-value">#${details.reservationId}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Hébergement :</span>
                <span class="details-value">${details.bienTitle}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Hôte / Loueur :</span>
                <span class="details-value">${details.loueurName}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Arrivée (Check-in) :</span>
                <span class="details-value">${details.checkIn}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Départ (Check-out) :</span>
                <span class="details-value">${details.checkOut}</span>
              </div>
              <div class="details-row" style="border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 12px;">
                <span class="details-label total">Montant total :</span>
                <span class="details-value total">${details.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>

            <p>Vous pouvez consulter, modifier ou gérer vos réservations à tout moment depuis votre espace personnel dans notre application mobile.</p>
            <p>Bon voyage et excellent séjour !<br>L'équipe LOKALI</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} LOKALI. Tous droits réservés.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(to, subject, html);
}

/**
 * Sends a payment reminder email to the user.
 * 
 * @param {string} to - The user's email address.
 * @param {PaymentDetails} details - The payment and due date details.
 * @returns {Promise<void>}
 */
export async function sendPaymentReminderEmail(to: string, details: PaymentDetails): Promise<void> {
  const subject = `Rappel : Paiement en attente pour votre réservation #${details.reservationId} ⏳`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Rappel de paiement</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7fafc; color: #2d3748; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
          .header { text-align: center; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #dd6b20; letter-spacing: 1px; }
          .content { padding-top: 30px; line-height: 1.6; }
          .alert-box { background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .button-container { text-align: center; margin-top: 30px; }
          .button { background-color: #dd6b20; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">LOKALI</span>
          </div>
          <div class="content">
            <p>Bonjour <strong>${details.userName}</strong>,</p>
            <p>Ceci est un rappel concernant le paiement de votre réservation <strong>#${details.reservationId}</strong>.</p>
            
            <div class="alert-box">
              <strong>Informations importantes :</strong><br>
              Montant en attente : <strong>${details.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong><br>
              Date limite de paiement : <strong>${details.dueDate}</strong>
            </div>

            <p>Afin de confirmer et de sécuriser définitivement votre séjour, nous vous invitons à procéder au règlement en cliquant sur le lien ci-dessous ou directement depuis notre application mobile.</p>
            
            <div class="button-container">
              <a href="#" class="button">Régler la réservation</a>
            </div>

            <p>Passé ce délai, votre option de réservation sera automatiquement annulée.</p>
            <p>Si vous avez déjà effectué le règlement, veuillez ignorer ce message.</p>
            <p>Cordialement,<br>L'équipe LOKALI</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} LOKALI. Tous droits réservés.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(to, subject, html);
}

// FICHIER SUIVANT : backend/src/test-config.ts (pour vérification)
