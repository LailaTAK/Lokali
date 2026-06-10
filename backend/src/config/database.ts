// backend/src/config/database.ts

import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Singleton instance of PrismaClient.
 * In development, we enable query logging, information messages, warnings, and errors.
 * In production, we only log warnings and errors to reduce log verbosity.
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Establishes connection to the PostgreSQL database.
 * @returns {Promise<void>}
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully.');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    process.exit(1);
  }
}

/**
 * Closes the connection to the PostgreSQL database.
 * @returns {Promise<void>}
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('🔌 PostgreSQL database connection closed.');
  } catch (error) {
    console.error('❌ Error during PostgreSQL database disconnection:', error);
  }
}

// Graceful shutdown on process termination
const handleGracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting database graceful shutdown...`);
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

// FICHIER SUIVANT : backend/src/config/redis.ts
