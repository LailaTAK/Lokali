// backend/src/config/bullmq.ts

import { Queue, QueueOptions, DefaultJobOptions } from 'bullmq';
import { redis } from './redis';

/**
 * Default configurations for BullMQ jobs.
 * This includes attempt counts, backoff strategy, and cleaning up completed jobs.
 */
export const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // starting delay: 1 second
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs in history for 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs in history for 7 days
  },
};

/**
 * Standard configuration options for all queues in the application.
 */
export const queueOptions: QueueOptions = {
  connection: redis as any,
  defaultJobOptions,
};

/**
 * Queue responsible for real-time notifications and system alerts.
 */
export const alerteQueue = new Queue('alerte', queueOptions);

/**
 * Queue responsible for sending emails asynchronously (welcome emails, booking confirmations, etc.).
 */
export const emailQueue = new Queue('email', queueOptions);

/**
 * Queue responsible for heavy tasks such as PDF rendering (invoices, receipts).
 */
export const pdfQueue = new Queue('pdf', queueOptions);

/**
 * Helper function to safely clean up queue connections on application shutdown.
 * 
 * @returns {Promise<void>}
 */
export async function closeQueues(): Promise<void> {
  try {
    await Promise.all([
      alerteQueue.close(),
      emailQueue.close(),
      pdfQueue.close(),
    ]);
    console.log('🔌 BullMQ queues closed successfully.');
  } catch (error) {
    console.error('❌ Error closing BullMQ queues:', error);
  }
}

// Graceful shutdown on process termination
process.on('SIGINT', async () => {
  await closeQueues();
});
process.on('SIGTERM', async () => {
  await closeQueues();
});

// FICHIER SUIVANT : backend/src/config/storage.ts
