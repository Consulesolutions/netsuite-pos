import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// Get all payments
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 50, method, startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};

    if (method) {
      where.method = (method as string).toUpperCase();
    }

    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) {
        (where.processedAt as Record<string, unknown>).gte = new Date(startDate as string);
      }
      if (endDate) {
        (where.processedAt as Record<string, unknown>).lte = new Date(endDate as string);
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      take: Number(limit),
      orderBy: { processedAt: 'desc' },
      include: {
        transaction: {
          select: {
            receiptNumber: true,
            status: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        payments: payments.map((p) => ({
          id: p.id,
          transactionId: p.transactionId,
          method: p.method.toLowerCase(),
          amount: Number(p.amount),
          reference: p.reference,
          cardLast4: p.cardLast4,
          cardBrand: p.cardBrand,
          status: p.status.toLowerCase(),
          processedAt: p.processedAt,
          transaction: p.transaction,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Process payment (for card payments via terminal)
router.post('/process', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, method, terminalId: _terminalId } = req.body;

    if (!amount || !method) {
      throw new ValidationError('Amount and method are required');
    }

    // In a real implementation, this would integrate with Stripe Terminal or Square
    // For now, simulate a successful payment

    const reference = `PAY-${Date.now()}`;

    res.json({
      success: true,
      data: {
        payment: {
          reference,
          amount,
          method,
          status: 'completed',
          cardLast4: method === 'card' ? '4242' : null,
          cardBrand: method === 'card' ? 'visa' : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refund payment
router.post('/:id/refund', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { transaction: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status === 'REFUNDED') {
      throw new ValidationError('Payment already refunded');
    }

    const refundAmount = amount || Number(payment.amount);

    // Update payment status
    const refundedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'REFUNDED',
      },
    });

    // In a real implementation, this would process the refund through the payment provider

    res.json({
      success: true,
      data: {
        payment: {
          id: refundedPayment.id,
          status: refundedPayment.status.toLowerCase(),
          refundAmount,
          reason,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
