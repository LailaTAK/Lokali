// backend/src/test-config.ts

import { env } from './config/env';
import { prisma, connectDatabase, disconnectDatabase } from './config/database';
import { redis, get, set, del, setEx } from './config/redis';
import { alerteQueue, emailQueue, pdfQueue, defaultJobOptions } from './config/bullmq';
import { s3Client, uploadFile, deleteFile, getSignedUrl } from './config/storage';
import { sendEmail, sendWelcomeEmail, sendReservationConfirmationEmail, sendPaymentReminderEmail } from './config/mailer';

console.log('Testing configuration files compile and load...');

console.log({
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  prismaExists: typeof prisma !== 'undefined',
  redisExists: typeof redis !== 'undefined',
  queuesExist: typeof alerteQueue !== 'undefined' && typeof emailQueue !== 'undefined' && typeof pdfQueue !== 'undefined',
  s3Exists: typeof s3Client !== 'undefined',
  sendEmailExists: typeof sendEmail !== 'undefined',
});
