// backend/src/config/env.ts

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

/**
 * Zod schema to validate environment variables.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1, 'JWT_REFRESH_EXPIRES_IN is required'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  SENDGRID_API_KEY: z.string().min(1, 'SENDGRID_API_KEY is required'),
  SENDGRID_FROM: z.string().email('SENDGRID_FROM must be a valid email'),
  MAPBOX_TOKEN: z.string().min(1, 'MAPBOX_TOKEN is required'),
  SENTRY_DSN: z.string().min(1, 'SENTRY_DSN is required'),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional().default(''),
  LOGTAIL_TOKEN: z.string().optional(),
  PORT: z.preprocess((val) => (val ? Number(val) : 5000), z.number().int().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate process.env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid or missing environment variables:');
  parsed.error.errors.forEach((err) => {
    console.error(`   - ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

/**
 * Validated environment variables config.
 */
export const env = parsed.data;

// FICHIER SUIVANT : backend/src/config/database.ts
