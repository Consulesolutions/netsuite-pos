import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get sync status
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId!;

    const pendingCount = await prisma.syncQueueItem.count({
      where: {
        tenantId,
        attempts: { lt: 5 },
      },
    });

    const errorCount = await prisma.syncQueueItem.count({
      where: {
        tenantId,
        attempts: { gte: 5 },
      },
    });

    const lastSync = await prisma.syncQueueItem.findFirst({
      where: {
        tenantId,
        attempts: { gte: 5 },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        pendingCount,
        errorCount,
        lastSync: lastSync?.updatedAt || null,
        isOnline: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get pending sync items
router.get('/queue', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId!;

    const items = await prisma.syncQueueItem.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          type: item.type,
          action: item.action,
          attempts: item.attempts,
          lastAttempt: item.lastAttempt,
          error: item.error,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Add item to sync queue
router.post('/queue', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type, action, data } = req.body;
    const tenantId = req.user!.tenantId!;

    const item = await prisma.syncQueueItem.create({
      data: {
        tenantId,
        type,
        action,
        data,
      },
    });

    res.status(201).json({
      success: true,
      data: { itemId: item.id },
    });
  } catch (error) {
    next(error);
  }
});

// Process sync queue
router.post('/process', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId!;

    const pendingItems = await prisma.syncQueueItem.findMany({
      where: {
        tenantId,
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const results = [];

    for (const item of pendingItems) {
      try {
        // Process each item based on type
        switch (item.type) {
          case 'transaction':
            // Sync transaction to NetSuite
            // In a real implementation, this would call the NetSuite API
            await prisma.syncQueueItem.delete({
              where: { id: item.id },
            });
            results.push({ id: item.id, status: 'success' });
            break;

          case 'customer':
            // Sync customer to NetSuite
            await prisma.syncQueueItem.delete({
              where: { id: item.id },
            });
            results.push({ id: item.id, status: 'success' });
            break;

          case 'inventory_adjustment':
            // Sync inventory adjustment to NetSuite
            await prisma.syncQueueItem.delete({
              where: { id: item.id },
            });
            results.push({ id: item.id, status: 'success' });
            break;

          default:
            results.push({ id: item.id, status: 'unknown_type' });
        }
      } catch (error) {
        // Update attempts and error message
        await prisma.syncQueueItem.update({
          where: { id: item.id },
          data: {
            attempts: { increment: 1 },
            lastAttempt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        results.push({
          id: item.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Retry failed items
router.post('/retry', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId!;

    await prisma.syncQueueItem.updateMany({
      where: {
        tenantId,
        attempts: { gte: 5 },
      },
      data: {
        attempts: 0,
        error: null,
      },
    });

    res.json({
      success: true,
      message: 'Failed items reset for retry',
    });
  } catch (error) {
    next(error);
  }
});

// Clear sync queue
router.delete('/queue', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId!;

    await prisma.syncQueueItem.deleteMany({
      where: { tenantId },
    });

    res.json({
      success: true,
      message: 'Sync queue cleared',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
