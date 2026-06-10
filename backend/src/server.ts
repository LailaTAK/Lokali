// backend/src/server.ts

import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';
import { setupChatGateway } from './modules/messagerie/messagerie.gateway';
import { initScheduler } from './modules/alertes/alertes.scheduler';

// Import BullMQ Worker to ensure it starts listening to the queue
import { alertesWorker } from './modules/alertes/alertes.worker';

// Create HTTP Server
const httpServer = createServer(app);

// Attach Socket.io server to HTTP Server
const io = new Server(httpServer, {
  cors: {
    origin: '*', // allows client apps to connect directly
    methods: ['GET', 'POST'],
  },
});

// Configure Socket.io real-time chat gateway
setupChatGateway(io);

/**
 * Boots the LOKALI application backend server.
 * Connects to PostgreSQL, checks Redis, runs background queues,
 * registers schedulers, and binds to the target port.
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting LOKALI backend bootstrap process...');

    // 1. Establish PostgreSQL database connection via Prisma
    await connectDatabase();

    // 2. Validate Redis connectivity
    const pingResult = await redis.ping();
    logger.info(`✅ Redis connectivity check passed. Ping response: "${pingResult}"`);

    // 3. Register BullMQ repeatable cron schedules
    await initScheduler();

    // 4. Start listening for incoming HTTP and WebSocket requests
    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 LOKALI Server running at http://localhost:${env.PORT} in "${env.NODE_ENV}" environment.`);
    });
  } catch (error) {
    logger.error('❌ Bootstrap process failed. Server shutting down.', error);
    process.exit(1);
  }
}

// Start the server
startServer();

/**
 * Performs clean shutdown of all database, cache, real-time,
 * and background process connections on server shutdown.
 * 
 * @param {string} signal - The OS termination signal received.
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Launching graceful server cleanup...`);

  // 1. Shut down the HTTP server (stops receiving new TCP requests)
  httpServer.close(async () => {
    logger.info('🔌 HTTP server stopped accepting new requests.');

    // 2. Close active WebSocket connections
    try {
      io.close();
      logger.info('🔌 Socket.io connections closed.');
    } catch (wsErr) {
      logger.error('Error closing Socket.io connections:', wsErr);
    }

    // 3. Stop background queue worker
    try {
      await alertesWorker.close();
      logger.info('🔌 BullMQ worker closed.');
    } catch (workerErr) {
      logger.error('Error closing BullMQ worker:', workerErr);
    }

    // 4. Disconnect PostgreSQL and Redis
    try {
      await disconnectDatabase();
      redis.disconnect();
      logger.info('🔌 PostgreSQL and Redis cache connections closed.');
    } catch (connErr) {
      logger.error('Error closing database connections:', connErr);
    }

    logger.info('👋 Graceful server shutdown completed. Process exiting.');
    process.exit(0);
  });

  // Guard: force kill process if shutdown stalls
  setTimeout(() => {
    logger.error('❌ Graceful shutdown timed out after 10 seconds. Forcing process kill...');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
