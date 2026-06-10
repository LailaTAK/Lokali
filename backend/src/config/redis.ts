// backend/src/config/redis.ts

import Redis from 'ioredis';
import { env } from './env';

/**
 * Configure the Redis client instance with a custom retry strategy.
 * Note: BullMQ requires `maxRetriesPerRequest` to be null on the connection it uses.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('✅ Redis client connected successfully.');
});

redis.on('error', (error) => {
  console.error('❌ Redis client connection error:', error);
});

/**
 * Retrieves the value of a key from Redis.
 * 
 * @param {string} key - The key to look up.
 * @returns {Promise<string | null>} The value of the key, or null if it does not exist.
 */
export async function get(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error(`Error getting key "${key}" from Redis:`, error);
    throw error;
  }
}

/**
 * Sets a value for a key in Redis.
 * 
 * @param {string} key - The key to set.
 * @param {string} value - The value to store.
 * @returns {Promise<'OK'>} Command status.
 */
export async function set(key: string, value: string): Promise<'OK'> {
  try {
    return await redis.set(key, value);
  } catch (error) {
    console.error(`Error setting key "${key}" in Redis:`, error);
    throw error;
  }
}

/**
 * Deletes a key (or list of keys) from Redis.
 * 
 * @param {string} key - The key to delete.
 * @returns {Promise<number>} The number of keys that were removed.
 */
export async function del(key: string): Promise<number> {
  try {
    return await redis.del(key);
  } catch (error) {
    console.error(`Error deleting key "${key}" from Redis:`, error);
    throw error;
  }
}

/**
 * Sets a value for a key in Redis with an expiration timeout.
 * 
 * @param {string} key - The key to set.
 * @param {number} seconds - Expiration time in seconds.
 * @param {string} value - The value to store.
 * @returns {Promise<'OK'>} Command status.
 */
export async function setEx(key: string, seconds: number, value: string): Promise<'OK'> {
  try {
    return await redis.setex(key, seconds, value);
  } catch (error) {
    console.error(`Error setting expired key "${key}" in Redis:`, error);
    throw error;
  }
}

// Graceful shutdown on process termination
const handleGracefulShutdown = async () => {
  console.log('Disconnecting Redis client...');
  redis.disconnect();
};

process.on('SIGINT', handleGracefulShutdown);
process.on('SIGTERM', handleGracefulShutdown);

// FICHIER SUIVANT : backend/src/config/bullmq.ts
