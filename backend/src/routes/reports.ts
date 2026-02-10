import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Daily summary
router.get('/daily-summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const locationId = req.user?.locationId;
    const tenantId = req.user!.tenantId;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get transaction totals
    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          in: ['COMPLETED', 'SYNCED'],
        },
        ...(locationId && { locationId }),
      },
      include: {
        payments: true,
        items: true,
      },
    });

    const totalSales = transactions.reduce((sum, t) => sum + Number(t.total), 0);
    const transactionCount = transactions.length;
    const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;

    // Payment breakdown
    const paymentBreakdown: Record<string, number> = {
      cash: 0,
      card: 0,
      gift_card: 0,
      store_credit: 0,
      check: 0,
      other: 0,
    };

    transactions.forEach((t) => {
      t.payments.forEach((p) => {
        const method = p.method.toLowerCase();
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(p.amount);
      });
    });

    // Top items
    const itemSales: Record<string, { itemId: string; itemName: string; quantity: number; revenue: number }> = {};

    transactions.forEach((t) => {
      t.items.forEach((item) => {
        if (!itemSales[item.itemId]) {
          itemSales[item.itemId] = {
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: 0,
            revenue: 0,
          };
        }
        itemSales[item.itemId].quantity += Number(item.quantity);
        itemSales[item.itemId].revenue += Number(item.lineTotal);
      });
    });

    const topItems = Object.values(itemSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Hourly breakdown
    const hourlyBreakdown: { hour: number; sales: number; count: number }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourTransactions = transactions.filter((t) => {
        const txHour = new Date(t.createdAt).getHours();
        return txHour === hour;
      });

      hourlyBreakdown.push({
        hour,
        sales: hourTransactions.reduce((sum, t) => sum + Number(t.total), 0),
        count: hourTransactions.length,
      });
    }

    res.json({
      success: true,
      data: {
        date: start.toISOString().split('T')[0],
        totalSales,
        transactionCount,
        averageTransaction,
        paymentBreakdown,
        topItems,
        hourlyBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Payment breakdown
router.get('/payment-breakdown', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const tenantId = req.user!.tenantId;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const payments = await prisma.payment.groupBy({
      by: ['method'],
      where: {
        transaction: {
          tenantId,
        },
        processedAt: {
          gte: start,
          lte: end,
        },
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        breakdown: payments.map((p) => ({
          method: p.method.toLowerCase(),
          amount: Number(p._sum.amount),
          count: p._count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Top items
router.get('/top-items', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const tenantId = req.user!.tenantId;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const items = await prisma.transactionItem.groupBy({
      by: ['itemId', 'itemName'],
      where: {
        transaction: {
          tenantId,
          createdAt: {
            gte: start,
            lte: end,
          },
          status: {
            in: ['COMPLETED', 'SYNCED'],
          },
        },
      },
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: {
          lineTotal: 'desc',
        },
      },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: {
        topItems: items.map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: Number(item._sum.quantity),
          revenue: Number(item._sum.lineTotal),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cashier summary
router.get('/cashier-summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const tenantId = req.user!.tenantId;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        total: true,
      },
      _count: true,
    });

    // Get user details and void/refund counts
    const summaries = await Promise.all(
      transactions.map(async (t) => {
        const user = await prisma.user.findUnique({
          where: { id: t.userId },
          select: { firstName: true, lastName: true },
        });

        const voidCount = await prisma.transaction.count({
          where: {
            userId: t.userId,
            status: 'VOIDED',
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        });

        const refundCount = await prisma.transaction.count({
          where: {
            userId: t.userId,
            type: 'RETURN',
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        });

        return {
          userId: t.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          transactionCount: t._count,
          totalSales: Number(t._sum.total),
          voidCount,
          refundCount,
        };
      })
    );

    res.json({
      success: true,
      data: { cashierSummaries: summaries },
    });
  } catch (error) {
    next(error);
  }
});

// Hourly sales
router.get('/hourly-sales', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query;
    const tenantId = req.user!.tenantId;

    const targetDate = date ? new Date(date as string) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          in: ['COMPLETED', 'SYNCED'],
        },
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    const hourlyData: { hour: number; sales: number; count: number }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourTransactions = transactions.filter((t) => {
        const txHour = new Date(t.createdAt).getHours();
        return txHour === hour;
      });

      hourlyData.push({
        hour,
        sales: hourTransactions.reduce((sum, t) => sum + Number(t.total), 0),
        count: hourTransactions.length,
      });
    }

    res.json({
      success: true,
      data: { hourlyData },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
