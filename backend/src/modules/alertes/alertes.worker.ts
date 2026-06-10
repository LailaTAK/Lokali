// backend/src/modules/alertes/alertes.worker.ts

import { Worker, Job } from 'bullmq';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { sendPushNotification } from './alertes.service';
import { sendEmail } from '../../config/mailer';
import { generateAndUploadRecu } from '../../utils/pdf.generator';

/**
 * BullMQ Worker listening on the "alerte" queue.
 * Processes background tasks such as dispatching pushes, mailing customers,
 * rendering receipts, and executing scheduler cron routines.
 */
export const alertesWorker = new Worker(
  'alerte', // Matched with alerteQueue in config/bullmq.ts
  async (job: Job) => {
    logger.info(`⚙️ BullMQ Job #${job.id} started. Name: "${job.name}"`);

    switch (job.name) {
      case 'send-push': {
        const { userId, titre, body } = job.data;
        if (!userId || !titre || !body) {
          throw new Error('Invalid arguments for send-push job. Required: [userId, titre, body].');
        }
        await sendPushNotification(userId, titre, body);
        break;
      }

      case 'send-email': {
        const { to, subject, html, text } = job.data;
        if (!to || !subject || !html) {
          throw new Error('Invalid arguments for send-email job. Required: [to, subject, html].');
        }
        await sendEmail(to, subject, html, text);
        break;
      }

      case 'generate-pdf': {
        const { reservation, paiement, user } = job.data;
        if (!reservation || !paiement || !user) {
          throw new Error('Invalid arguments for generate-pdf job. Required: [reservation, paiement, user].');
        }
        const s3Url = await generateAndUploadRecu(reservation, paiement, user);
        logger.info(`✨ Receipt S3 URL generated via worker: ${s3Url}`);
        break;
      }

      case 'reminder-resa': {
        const { to, subject, html } = job.data;
        if (!to || !subject || !html) {
          throw new Error('Invalid arguments for reminder-resa job. Required: [to, subject, html].');
        }
        await sendEmail(to, subject, html);
        break;
      }

      // --- SCHEDULER CRONS HANDLERS ---

      case 'hourly-booking-reminders': {
        logger.info('Running hourly check-in reminders cron job...');
        
        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

        // Find confirmed reservations checking in tomorrow that haven't been reminded
        const reservations = await prisma.reservation.findMany({
          where: {
            statut: 'CONFIRMEE',
            checkIn: { gte: tomorrowStart, lt: tomorrowEnd },
            rappelEnvoye: { not: true }, // custom flag or checking if reminded
          },
          include: {
            client: true,
            bien: { include: { loueur: true } },
          },
        });

        logger.info(`Found ${reservations.length} reservations starting tomorrow to remind.`);

        for (const res of reservations) {
          // Notify guest
          const clientMsg = `Rappel : Votre séjour chez "${res.bien.titre}" débute demain (${res.checkIn.toLocaleDateString('fr-FR')}). Bon voyage !`;
          await sendPushNotification(res.clientId, 'Votre séjour commence demain ! 🏠', clientMsg);
          await sendEmail(
            res.client.email,
            'Votre séjour commence demain ! LOKALI 🏠',
            `<h3>Rappel d'arrivée</h3><p>Bonjour ${res.client.prenom}, votre séjour chez ${res.bien.loueur.prenom} commence demain !</p>`
          );

          // Notify host
          const hostMsg = `Rappel : Vous accueillez ${res.client.prenom} ${res.client.nom} demain dans votre logement "${res.bien.titre}".`;
          await sendPushNotification(res.bien.loueurId, 'Arrivée de voyageur demain ! 🔑', hostMsg);
          await sendEmail(
            res.bien.loueur.email,
            'Arrivée de voyageur demain ! LOKALI 🔑',
            `<h3>Rappel d'accueil</h3><p>Bonjour ${res.bien.loueur.prenom}, préparez vos clés ! Vous accueillez ${res.client.prenom} demain.</p>`
          );

          // Update reservation to mark reminder as sent
          await prisma.reservation.update({
            where: { id: res.id },
            data: { rappelEnvoye: true } as any, // fallback in case TS/Prisma schema updates are pending
          });
        }
        break;
      }

      case 'daily-checkout-transitions': {
        logger.info('Running daily checkout transitions cron job...');
        
        const now = new Date();

        // Transition confirmed bookings whose checkOut has passed to TERMINEE
        const result = await prisma.reservation.updateMany({
          where: {
            checkOut: { lt: now },
            statut: 'CONFIRMEE',
          },
          data: {
            statut: 'TERMINEE',
          },
        });

        logger.info(`Daily checkout cron completed. Transitioned ${result.count} reservations to TERMINEE.`);
        break;
      }

      case 'weekly-alert-cleanup': {
        logger.info('Running weekly notifications cleanup cron job...');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Delete read alerts older than 30 days
        const result = await prisma.alerte.deleteMany({
          where: {
            lu: true,
            createdAt: { lt: thirtyDaysAgo },
          },
        });

        logger.info(`Weekly alert cleanup completed. Cleaned up ${result.count} read notifications older than 30 days.`);
        break;
      }

      default:
        logger.warn(`⚠️ Unhandled job name "${job.name}" on "alerte" queue. Skipping execution.`);
        break;
    }
  },
  {
    connection: redis as any,
    concurrency: 5,
  }
);

// --- WORKER EVENT LISTENERS ---

alertesWorker.on('completed', (job: Job) => {
  logger.info(`✅ BullMQ Job #${job.id} ("${job.name}") completed successfully.`);
});

alertesWorker.on('failed', (job: Job | undefined, error: Error) => {
  if (job) {
    logger.error(`❌ BullMQ Job #${job.id} ("${job.name}") failed on attempt ${job.attemptsMade}:`, {
      message: error.message,
      stack: error.stack,
    });
  } else {
    logger.error('❌ BullMQ Worker encountered a global failure:', error);
  }
});

alertesWorker.on('error', (err) => {
  logger.error('❌ BullMQ Worker error event:', err);
});

const handleGracefulShutdown = async () => {
  logger.info('Shutting down BullMQ alerte worker...');
  await alertesWorker.close();
};

process.on('SIGINT', handleGracefulShutdown);
process.on('SIGTERM', handleGracefulShutdown);

// FICHIER SUIVANT : backend/src/modules/alertes/alertes.scheduler.ts
