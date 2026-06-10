// backend/src/modules/alertes/alertes.scheduler.ts

import { alerteQueue } from '../../config/bullmq';
import { logger } from '../../utils/logger';

/**
 * Initializes repeatable BullMQ jobs (Cron tasks) on the "alerte" queue.
 * - Hourly check: reservations starting tomorrow -> reminder jobs.
 * - Daily midnight check: reservations whose checkout dates have passed -> TERMINEE status.
 * - Weekly check (Sundays at midnight): cleans up read alerts older than 30 days.
 * 
 * @returns {Promise<void>}
 */
export async function initScheduler(): Promise<void> {
  try {
    // 1. Hourly check-in reminders (triggers at minute 0 of every hour)
    await alerteQueue.add(
      'hourly-booking-reminders',
      {},
      {
        repeat: {
          pattern: '0 * * * *',
        },
        jobId: 'cron:booking-reminders', // Static ID to prevent duplicates on restarts
      }
    );

    // 2. Daily checkout transitions (triggers every night at midnight)
    await alerteQueue.add(
      'daily-checkout-transitions',
      {},
      {
        repeat: {
          pattern: '0 0 * * *',
        },
        jobId: 'cron:checkout-transitions',
      }
    );

    // 3. Weekly notification cleanup (triggers every Sunday at midnight)
    await alerteQueue.add(
      'weekly-alert-cleanup',
      {},
      {
        repeat: {
          pattern: '0 0 * * 0',
        },
        jobId: 'cron:alert-cleanup',
      }
    );

    logger.info('⏰ BullMQ Cron Schedulers successfully registered.');
  } catch (error) {
    logger.error('❌ Failed to initialize BullMQ Cron Schedulers:', error);
  }
}
