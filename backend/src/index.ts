// Early error handling to catch import failures
console.log('[STARTUP] Beginning server initialization...');

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  process.exit(1);
});

import express from 'express';
console.log('[STARTUP] Express loaded');

import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

console.log('[STARTUP] Core dependencies loaded');

import { logger } from './utils/logger.js';
console.log('[STARTUP] Logger loaded');

import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
console.log('[STARTUP] Middleware loaded');

// Routes
import authRoutes from './routes/auth.js';
console.log('[STARTUP] Auth routes loaded');

import itemRoutes from './routes/items.js';
import customerRoutes from './routes/customers.js';
import transactionRoutes from './routes/transactions.js';
import inventoryRoutes from './routes/inventory.js';
import paymentRoutes from './routes/payments.js';
import shiftRoutes from './routes/shifts.js';
import reportRoutes from './routes/reports.js';
import syncRoutes from './routes/sync.js';
import netsuiteRoutes from './routes/netsuite.js';
console.log('[STARTUP] Main routes loaded');

import billingRoutes from './routes/billing.js';
console.log('[STARTUP] Billing routes loaded');

import tenantRoutes from './routes/tenants.js';
import adminRoutes from './routes/admin.js';
import invitationRoutes from './routes/invitations.js';
console.log('[STARTUP] All routes loaded');

dotenv.config();

const app = express();

// Trust proxy - required for express-rate-limit behind Railway/Vercel proxy
// This allows proper IP detection behind load balancers
app.set('trust proxy', 1);
console.log('[STARTUP] Trust proxy enabled');

const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean) as string[];

// Also allow any Vercel preview URLs for this project
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow requests with no origin (like mobile apps or curl)
  if (allowedOrigins.includes(origin)) return true;
  // Allow Vercel preview deployments
  if (origin.includes('vercel.app')) return true;
  return false;
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/invitations', invitationRoutes); // Public invitation acceptance + protected tenant invites
app.use('/api/billing/plans', billingRoutes); // Public: get plans
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), billingRoutes); // Stripe webhook needs raw body

// Super Admin routes
app.use('/api/admin', adminRoutes);

// Protected routes
app.use('/api/billing', authMiddleware, billingRoutes);
app.use('/api/items', authMiddleware, itemRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/shifts', authMiddleware, shiftRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/sync', authMiddleware, syncRoutes);
app.use('/api/netsuite', authMiddleware, netsuiteRoutes);

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-location', (locationId: string) => {
    socket.join(`location:${locationId}`);
    logger.info(`Socket ${socket.id} joined location ${locationId}`);
  });

  socket.on('join-register', (registerId: string) => {
    socket.join(`register:${registerId}`);
    logger.info(`Socket ${socket.id} joined register ${registerId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, io };
