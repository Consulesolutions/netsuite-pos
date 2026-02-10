import { Router, Response, NextFunction } from 'express';
import { PrismaClient, ShiftStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// Get all shifts
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 50, status, registerId } = req.query;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = (status as string).toUpperCase();
    }

    if (registerId) {
      where.registerId = registerId;
    }

    const shifts = await prisma.shift.findMany({
      where,
      take: Number(limit),
      orderBy: { startTime: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        register: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        shifts: shifts.map((s) => ({
          id: s.id,
          registerId: s.registerId,
          userId: s.userId,
          startTime: s.startTime,
          endTime: s.endTime,
          openingBalance: Number(s.openingBalance),
          closingBalance: s.closingBalance ? Number(s.closingBalance) : null,
          expectedCash: s.expectedCash ? Number(s.expectedCash) : null,
          variance: s.variance ? Number(s.variance) : null,
          status: s.status.toLowerCase(),
          user: s.user,
          register: s.register,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current shift
router.get('/current', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: {
        userId: req.user!.id,
        status: 'OPEN',
      },
      include: {
        register: true,
      },
    });

    if (!shift) {
      res.json({
        success: true,
        data: { shift: null },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        shift: {
          id: shift.id,
          registerId: shift.registerId,
          startTime: shift.startTime,
          openingBalance: Number(shift.openingBalance),
          status: shift.status.toLowerCase(),
          register: shift.register,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Open shift
router.post('/open', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { registerId, openingBalance } = req.body;

    if (!registerId || openingBalance === undefined) {
      throw new ValidationError('Register ID and opening balance are required');
    }

    // Check if user already has an open shift
    const existingShift = await prisma.shift.findFirst({
      where: {
        userId: req.user!.id,
        status: 'OPEN',
      },
    });

    if (existingShift) {
      throw new ConflictError('You already have an open shift');
    }

    // Check if register already has an open shift
    const registerShift = await prisma.shift.findFirst({
      where: {
        registerId,
        status: 'OPEN',
      },
    });

    if (registerShift) {
      throw new ConflictError('This register already has an open shift');
    }

    const shift = await prisma.shift.create({
      data: {
        registerId,
        userId: req.user!.id,
        openingBalance,
        status: 'OPEN' as ShiftStatus,
      },
      include: {
        register: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        shift: {
          id: shift.id,
          registerId: shift.registerId,
          startTime: shift.startTime,
          openingBalance: Number(shift.openingBalance),
          status: shift.status.toLowerCase(),
          register: shift.register,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Close shift
router.post('/:id/close', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { closingBalance } = req.body;

    if (closingBalance === undefined) {
      throw new ValidationError('Closing balance is required');
    }

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      throw new NotFoundError('Shift not found');
    }

    if (shift.status === 'CLOSED') {
      throw new ConflictError('Shift already closed');
    }

    if (shift.userId !== req.user!.id) {
      throw new ValidationError('You can only close your own shift');
    }

    // Calculate expected cash
    const cashPayments = await prisma.payment.aggregate({
      where: {
        method: 'CASH',
        transaction: {
          userId: req.user!.id,
          createdAt: {
            gte: shift.startTime,
          },
          status: {
            in: ['COMPLETED', 'SYNCED'],
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    const expectedCash =
      Number(shift.openingBalance) + Number(cashPayments._sum.amount || 0);
    const variance = closingBalance - expectedCash;

    const closedShift = await prisma.shift.update({
      where: { id },
      data: {
        endTime: new Date(),
        closingBalance,
        expectedCash,
        variance,
        status: 'CLOSED' as ShiftStatus,
      },
      include: {
        register: true,
      },
    });

    res.json({
      success: true,
      data: {
        shift: {
          id: closedShift.id,
          startTime: closedShift.startTime,
          endTime: closedShift.endTime,
          openingBalance: Number(closedShift.openingBalance),
          closingBalance: Number(closedShift.closingBalance),
          expectedCash: Number(closedShift.expectedCash),
          variance: Number(closedShift.variance),
          status: closedShift.status.toLowerCase(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
