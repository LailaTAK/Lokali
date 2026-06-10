// backend/src/utils/pdf.generator.ts

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { uploadBuffer, getSignedUrl } from '../config/storage';
import { logger } from './logger';

export interface ReservationInfo {
  id: string;
  bienTitle: string;
  checkIn: string;
  checkOut: string;
  nightsCount: number;
}

export interface PaymentInfo {
  id: string;
  amount: number;
  paymentMethod: string;
  createdAt: Date | string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

/**
 * Generates a PDF Payment Receipt buffer.
 * Renders a clean invoice layout with the Lokali brand name, customer details,
 * reservation recap, total price, and a scannable transaction verification QR code.
 * 
 * @param {ReservationInfo} reservation - Details about the booking.
 * @param {PaymentInfo} paiement - Details about the transaction.
 * @param {UserInfo} user - Details about the paying client.
 * @returns {Promise<Buffer>} A promise resolving to the binary PDF buffer.
 */
export async function generateRecuPaiement(
  reservation: ReservationInfo,
  paiement: PaymentInfo,
  user: UserInfo
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Brand Identity Colors (Deep Charcoal & Teal Accent)
      const primaryColor = '#1A202C'; // slate gray
      const accentColor = '#319795'; // teal
      const textColor = '#2D3748';
      const mutedTextColor = '#718096';

      // --- HEADER SECTION ---
      doc
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .fontSize(26)
        .text('LOKALI', 50, 50);

      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('REÇU DE PAIEMENT', 50, 80);

      doc
        .fillColor(mutedTextColor)
        .font('Helvetica')
        .fontSize(9)
        .text(`Date d'émission: ${new Date(paiement.createdAt).toLocaleDateString('fr-FR')}`, 50, 98);

      // --- INVOICE INFO BLOCK ---
      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('ÉMIS POUR :', 50, 140)
        .font('Helvetica')
        .fillColor(textColor)
        .text(`Nom: ${user.name}`, 50, 155)
        .text(`Email: ${user.email}`, 50, 170)
        .text(`ID Client: #${user.id}`, 50, 185);

      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('RÉFÉRENCE TRANSACTION :', 300, 140)
        .font('Helvetica')
        .fillColor(textColor)
        .text(`N° Reçu: REC-${paiement.id.substring(0, 8).toUpperCase()}`, 300, 155)
        .text(`ID Réservation: #${reservation.id}`, 300, 170)
        .text(`Méthode: ${paiement.paymentMethod}`, 300, 185);

      // Draw horizontal dividing line
      doc
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .moveTo(50, 215)
        .lineTo(545, 215)
        .stroke();

      // --- DETAILS TABLE ---
      // Table Header
      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Description', 50, 235)
        .text('Période / Détails', 200, 235)
        .text('Total (EUR)', 450, 235, { align: 'right', width: 95 });

      // Table Row
      doc
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(10)
        .text(`Location : ${reservation.bienTitle}`, 50, 260)
        .text(`${reservation.checkIn} au ${reservation.checkOut}\n(${reservation.nightsCount} nuits)`, 200, 260)
        .text(
          paiement.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
          450,
          260,
          { align: 'right', width: 95 }
        );

      // Draw table row bottom border
      doc
        .strokeColor('#E2E8F0')
        .lineWidth(0.5)
        .moveTo(50, 305)
        .lineTo(545, 305)
        .stroke();

      // --- TOTAL SECTION ---
      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Montant total payé :', 320, 325)
        .fillColor(accentColor)
        .fontSize(14)
        .text(
          paiement.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
          450,
          325,
          { align: 'right', width: 95 }
        );

      // --- QR CODE & VERIFICATION ---
      // Generate QR Code containing payment verification payload
      const qrPayload = JSON.stringify({
        receiptId: paiement.id,
        reservationId: reservation.id,
        clientId: user.id,
        amount: paiement.amount,
        date: paiement.createdAt,
      });

      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        margin: 1,
        width: 100,
        color: {
          dark: '#1A202C',
          light: '#FFFFFF',
        },
      });

      // Embed QR code image in PDF
      doc.image(qrBuffer, 50, 380, { width: 90 });

      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('SCANNER POUR VÉRIFIER', 160, 395)
        .font('Helvetica')
        .fillColor(mutedTextColor)
        .fontSize(8)
        .text(
          'Ce QR code contient les signatures numériques de la transaction et permet la vérification de la validité de ce reçu par les équipes LOKALI.',
          160,
          410,
          { width: 350 }
        );

      // --- FOOTER ---
      doc
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .moveTo(50, 750)
        .lineTo(545, 750)
        .stroke();

      doc
        .fillColor(mutedTextColor)
        .font('Helvetica')
        .fontSize(8)
        .text(
          'LOKALI SAS — Plateforme de location immobilière en ligne. Pour toute assistance, veuillez contacter support@lokali.com',
          50,
          765,
          { align: 'center', width: 495 }
        );

      // End PDF stream writing
      doc.end();
    } catch (error) {
      logger.error('❌ Error generating PDF Receipt:', error);
      reject(error);
    }
  });
}

/**
 * Generates a payment receipt PDF, uploads it directly to the AWS S3 cloud storage,
 * and returns a secure presigned access URL valid for 7 days.
 * 
 * @param {ReservationInfo} reservation - Details about the booking.
 * @param {PaymentInfo} paiement - Details about the transaction.
 * @param {UserInfo} user - Details about the paying client.
 * @returns {Promise<string>} The secure S3 URL of the uploaded receipt PDF.
 */
export async function generateAndUploadRecu(
  reservation: ReservationInfo,
  paiement: PaymentInfo,
  user: UserInfo
): Promise<string> {
  try {
    // 1. Generate PDF
    const pdfBuffer = await generateRecuPaiement(reservation, paiement, user);

    // 2. Upload to S3 (saved in standard folder receipts/)
    const s3Key = `receipts/REC-${paiement.id}-${Date.now()}.pdf`;
    await uploadBuffer(pdfBuffer, s3Key, 'application/pdf');

    // 3. Obtain presigned URL (valid for 7 days)
    const expiresInSeconds = 7 * 24 * 3600;
    const url = await getSignedUrl(s3Key, expiresInSeconds);

    logger.info(`✨ Receipt PDF successfully generated and uploaded to S3: ${s3Key}`);
    return url;
  } catch (error) {
    logger.error('❌ Failed to generate and upload receipt PDF:', error);
    throw new Error('Receipt generation and cloud upload failed.');
  }
}

// FICHIER SUIVANT : backend/src/test-utils.ts (pour vérification)
