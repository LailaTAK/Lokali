// backend/src/app.ts

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { httpLogger } from './utils/logger';
import { apiLimiter } from './middlewares/rateLimiter.middleware';
import { notFound, errorHandler } from './middlewares/error.middleware';

// Import route modules
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { biensRouter } from './modules/biens/biens.routes';
import { annoncesRouter } from './modules/annonces/annonces.routes';
import { reservationsRouter } from './modules/reservations/reservations.routes';
import { paiementsRouter } from './modules/paiements/paiements.routes';
import { messagerieRouter } from './modules/messagerie/messagerie.routes';
import { alertesRouter } from './modules/alertes/alertes.routes';
import { adminRouter } from './modules/admin/admin.routes';

const app = express();

// --- SECURITY & COMPRESSION MIDDLEWARES ---

// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// Configure CORS using origins configured in env variables (or allow all if unset)
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-om-token', 'wave-signature', 'stripe-signature'],
    credentials: true,
  })
);

// Gzip compression for speeding up response deliveries
app.use(compression());

// Unified HTTP request logger (Morgan piped through Winston)
app.use(httpLogger);

// Limit incoming JSON body size to protect against body overflow DOS attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all standard API endpoints
app.use('/api/', apiLimiter);

// --- APP ROUTING ---

// Module endpoints mapping
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/biens', biensRouter);
app.use('/api/annonces', annoncesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/paiements', paiementsRouter);
app.use('/api/messages', messagerieRouter);
app.use('/api/alertes', alertesRouter);
app.use('/api/admin', adminRouter);

/**
 * Endpoint: Health check.
 * Public access. Used by orchestrators and load balancers to determine service health.
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- CATCH-ALLS & EXCEPTION HANDLERS ---

// Handle unmapped routes (triggers a 404 AppError)
app.use(notFound);

// Global operational and programming error processing middleware
app.use(errorHandler);

export default app;
export { app };
