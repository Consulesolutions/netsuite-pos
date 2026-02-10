import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

// Routes
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import customerRoutes from './routes/customers.js';
import transactionRoutes from './routes/transactions.js';
import inventoryRoutes from './routes/inventory.js';
import paymentRoutes from './routes/payments.js';
import shiftRoutes from './routes/shifts.js';
import reportRoutes from './routes/reports.js';
import syncRoutes from './routes/sync.js';
import netsuiteRoutes from './routes/netsuite.js';
import billingRoutes from './routes/billing.js';
import tenantRoutes from './routes/tenants.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
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
app.use('/api/billing/plans', billingRoutes); // Public: get plans
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), billingRoutes); // Stripe webhook needs raw body

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
