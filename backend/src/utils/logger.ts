// backend/src/utils/logger.ts

import winston from 'winston';
import morgan from 'morgan';
import { env } from '../config/env';

// Import Logtail transport conditionally to avoid crashes if the package is not loaded
let LogtailTransport: any = null;
if (env.LOGTAIL_TOKEN) {
  try {
    const { Logtail } = require('@logtail/winston');
    LogtailTransport = Logtail;
  } catch (error) {
    console.warn('⚠️ Logtail winston package is missing or could not be loaded:', error);
  }
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

/**
 * Custom format for development console logging.
 * Prints logs with colors and timestamps.
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `[${info.timestamp}] [${info.level}]: ${info.message}`)
);

/**
 * Custom format for production console logging.
 * Prints logs in standard JSON format for log processors.
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

/**
 * Unified Winston logger instance.
 */
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'development' ? devFormat : prodFormat,
    }),
  ],
});

// Add Logtail cloud logger if the token is supplied and transport is available
if (env.LOGTAIL_TOKEN && LogtailTransport) {
  logger.add(new LogtailTransport(env.LOGTAIL_TOKEN));
  logger.info('☁️ Logtail cloud logging transport initialized successfully.');
}

/**
 * Stream implementation for Morgan to pipe HTTP logs through the Winston logger.
 */
const stream: morgan.StreamOptions = {
  write: (message: string) => {
    // Pipe http messages into logger under the 'http' level
    logger.log('http', message.trim());
  },
};

/**
 * Express Morgan HTTP log middleware.
 * Uses 'combined' (Apache combined format) in production and 'dev' format in development.
 */
export const httpLogger = morgan(
  env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream }
);

// FICHIER SUIVANT : backend/src/utils/pagination.ts
