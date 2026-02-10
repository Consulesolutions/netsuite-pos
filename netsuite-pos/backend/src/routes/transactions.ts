import { Router, Response, NextFunction } from 'express';
import { PrismaClient, TransactionType, TransactionStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { Server as SocketServer } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

// Get all transactions
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 50, status, type, startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};

    if (req.user?.locationId) {
      where.locationId = req.user.locationId;
    }

    if (status) {
      where.status = (status as string).toUpperCase();
    }

    if (type) {
      where.type = (type as string).toUpperCase();
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate as string);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate as string);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.map((t) => ({
          id: t.id,
          netsuiteId: t.netsuiteId,
          type: t.type.toLowerCase(),
          status: t.status.toLowerCase(),
          receiptNumber: t.receiptNumber,
          customerId: t.customerId,
          customer: t.customer ? {
            firstName: t.customer.firstName,
            lastName: t.customer.lastName,
          } : null,
          subtotal: Number(t.subtotal),
          taxTotal: Number(t.taxTotal),
          discountTotal: Number(t.discountTotal),
          total: Number(t.total),
          createdAt: t.createdAt,
          syncedAt: t.syncedAt,
          items: t.items.map((item) => ({
            id: item.id,
            itemId: item.itemId,
            itemName: item.itemName,
            sku: item.sku,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discountAmount: Number(item.discountAmount),
            taxAmount: Number(item.taxAmount),
            lineTotal: Number(item.lineTotal),
          })),
          payments: t.payments.map((p) => ({
            id: p.id,
            method: p.method.toLowerCase(),
            amount: Number(p.amount),
            reference: p.reference,
            cardLast4: p.cardLast4,
            status: p.status.toLowerCase(),
          })),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        payments: true,
        user: true,
        register: true,
        location: true,
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    res.json({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          netsuiteId: transaction.netsuiteId,
          type: transaction.type.toLowerCase(),
          status: transaction.status.toLowerCase(),
          receiptNumber: transaction.receiptNumber,
          customerId: transaction.customerId,
          customer: transaction.customer,
          subtotal: Number(transaction.subtotal),
          taxTotal: Number(transaction.taxTotal),
          discountTotal: Number(transaction.discountTotal),
          total: Number(transaction.total),
          notes: transaction.notes,
          createdAt: transaction.createdAt,
          syncedAt: transaction.syncedAt,
          user: {
            firstName: transaction.user.firstName,
            lastName: transaction.user.lastName,
          },
          register: transaction.register.name,
          location: transaction.location.name,
          items: transaction.items,
          payments: transaction.payments,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create transaction
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      id,
      type,
      customerId,
      items,
      payments,
      subtotal,
      taxTotal,
      discountTotal,
      total,
      notes,
      receiptNumber,
    } = req.body;

    if (!items || items.length === 0) {
      throw new ValidationError('Transaction must have at least one item');
    }

    if (!payments || payments.length === 0) {
      throw new ValidationError('Transaction must have at least one payment');
    }

    const transaction = await prisma.transaction.create({
      data: {
        id: id || undefined,
        type: (type?.toUpperCase() || 'SALE') as TransactionType,
        status: 'COMPLETED' as TransactionStatus,
        registerId: req.body.registerId,
        locationId: req.user!.locationId!,
        userId: req.user!.id,
        customerId,
        receiptNumber: receiptNumber || generateReceiptNumber(),
        subtotal,
        taxTotal,
        discountTotal: discountTotal || 0,
        total,
        notes,
        items: {
          create: items.map((item: {
            itemId: string;
            itemName: string;
            sku: string;
            quantity: number;
            unitPrice: number;
            discountAmount?: number;
            taxAmount?: number;
            lineTotal: number;
          }) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount || 0,
            taxAmount: item.taxAmount || 0,
            lineTotal: item.lineTotal,
          })),
        },
        payments: {
          create: payments.map((payment: {
            method: string;
            amount: number;
            reference?: string;
            cardLast4?: string;
            cardBrand?: string;
          }) => ({
            method: payment.method.toUpperCase() as PaymentMethod,
            amount: payment.amount,
            reference: payment.reference,
            cardLast4: payment.cardLast4,
            cardBrand: payment.cardBrand,
            status: 'COMPLETED' as PaymentStatus,
          })),
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    // Update inventory
    for (const item of items) {
      await prisma.inventoryLevel.updateMany({
        where: {
          itemId: item.itemId,
          locationId: req.user!.locationId!,
        },
        data: {
          quantityOnHand: { decrement: item.quantity },
          quantityAvailable: { decrement: item.quantity },
        },
      });
    }

    // Emit real-time update
    const io = req.app.get('io') as SocketServer;
    io.to(`location:${req.user!.locationId}`).emit('transaction:created', {
      transactionId: transaction.id,
      receiptNumber: transaction.receiptNumber,
      total: Number(transaction.total),
    });

    res.status(201).json({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          receiptNumber: transaction.receiptNumber,
          status: transaction.status.toLowerCase(),
          total: Number(transaction.total),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Void transaction
router.post('/:id/void', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status === 'VOIDED') {
      throw new ValidationError('Transaction already voided');
    }

    // Void the transaction
    const voidedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'VOIDED',
        notes: transaction.notes
          ? `${transaction.notes}\nVoided: ${reason}`
          : `Voided: ${reason}`,
      },
    });

    // Restore inventory
    for (const item of transaction.items) {
      await prisma.inventoryLevel.updateMany({
        where: {
          itemId: item.itemId,
          locationId: transaction.locationId,
        },
        data: {
          quantityOnHand: { increment: Number(item.quantity) },
          quantityAvailable: { increment: Number(item.quantity) },
        },
      });
    }

    res.json({
      success: true,
      data: {
        transaction: {
          id: voidedTransaction.id,
          status: voidedTransaction.status.toLowerCase(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Sync transaction (for offline transactions)
router.post('/sync', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const transactionData = req.body;

    // Check if transaction already exists
    const existing = await prisma.transaction.findUnique({
      where: { id: transactionData.id },
    });

    if (existing) {
      res.json({
        success: true,
        data: {
          transactionId: existing.id,
          status: 'already_synced',
        },
      });
      return;
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        id: transactionData.id,
        type: transactionData.type.toUpperCase() as TransactionType,
        status: 'SYNCED' as TransactionStatus,
        registerId: transactionData.registerId,
        locationId: transactionData.locationId,
        userId: req.user!.id,
        customerId: transactionData.customerId,
        receiptNumber: transactionData.receiptNumber,
        subtotal: transactionData.subtotal,
        taxTotal: transactionData.taxTotal,
        discountTotal: transactionData.discountTotal,
        total: transactionData.total,
        notes: transactionData.notes,
        syncedAt: new Date(),
        createdAt: new Date(transactionData.createdAt),
        items: {
          create: transactionData.items,
        },
        payments: {
          create: transactionData.payments.map((p: { method: string }) => ({
            ...p,
            method: p.method.toUpperCase() as PaymentMethod,
            status: 'COMPLETED' as PaymentStatus,
          })),
        },
      },
    });

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        status: 'synced',
      },
    });
  } catch (error) {
    next(error);
  }
});

function generateReceiptNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${dateStr}-${random}`;
}

export default router;
