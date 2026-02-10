import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// Get inventory for a location
router.get('/:locationId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId } = req.params;
    const tenantId = req.user!.tenantId!;

    // Verify location belongs to tenant
    const location = await prisma.location.findFirst({
      where: { id: locationId, tenantId },
    });

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    const inventory = await prisma.inventoryLevel.findMany({
      where: { locationId },
      include: {
        item: true,
      },
    });

    res.json({
      success: true,
      data: {
        inventory: inventory.map((inv) => ({
          itemId: inv.itemId,
          locationId: inv.locationId,
          quantityOnHand: Number(inv.quantityOnHand),
          quantityAvailable: Number(inv.quantityAvailable),
          quantityCommitted: Number(inv.quantityCommitted),
          item: {
            name: inv.item.name,
            sku: inv.item.sku,
          },
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Adjust inventory
router.post('/adjust', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { itemId, adjustmentType, quantity, reason } = req.body;
    const locationId = req.user?.locationId;
    const tenantId = req.user!.tenantId!;

    if (!locationId) {
      throw new ValidationError('No location assigned');
    }

    if (!itemId || !adjustmentType || quantity === undefined) {
      throw new ValidationError('Item ID, adjustment type, and quantity are required');
    }

    const currentInventory = await prisma.inventoryLevel.findUnique({
      where: {
        itemId_locationId: {
          itemId,
          locationId,
        },
      },
    });

    if (!currentInventory) {
      throw new NotFoundError('Inventory record not found');
    }

    let newQuantity: number;
    const currentQty = Number(currentInventory.quantityOnHand);

    switch (adjustmentType) {
      case 'add':
        newQuantity = currentQty + quantity;
        break;
      case 'remove':
        newQuantity = Math.max(0, currentQty - quantity);
        break;
      case 'set':
        newQuantity = quantity;
        break;
      default:
        throw new ValidationError('Invalid adjustment type');
    }

    const updatedInventory = await prisma.inventoryLevel.update({
      where: {
        itemId_locationId: {
          itemId,
          locationId,
        },
      },
      data: {
        quantityOnHand: newQuantity,
        quantityAvailable: newQuantity - Number(currentInventory.quantityCommitted),
      },
    });

    // Log the adjustment
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user!.id,
        action: 'INVENTORY_ADJUSTMENT',
        entityType: 'InventoryLevel',
        entityId: updatedInventory.id,
        oldValue: { quantityOnHand: currentQty },
        newValue: { quantityOnHand: newQuantity, reason },
      },
    });

    res.json({
      success: true,
      data: {
        inventory: {
          itemId: updatedInventory.itemId,
          quantityOnHand: Number(updatedInventory.quantityOnHand),
          quantityAvailable: Number(updatedInventory.quantityAvailable),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create transfer order
router.post('/transfer', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { itemId, fromLocationId, toLocationId, quantity } = req.body;

    if (!itemId || !fromLocationId || !toLocationId || !quantity) {
      throw new ValidationError('All fields are required');
    }

    // Check source inventory
    const sourceInventory = await prisma.inventoryLevel.findUnique({
      where: {
        itemId_locationId: {
          itemId,
          locationId: fromLocationId,
        },
      },
    });

    if (!sourceInventory || Number(sourceInventory.quantityAvailable) < quantity) {
      throw new ValidationError('Insufficient inventory');
    }

    // Update source inventory (commit the quantity)
    await prisma.inventoryLevel.update({
      where: {
        itemId_locationId: {
          itemId,
          locationId: fromLocationId,
        },
      },
      data: {
        quantityCommitted: { increment: quantity },
        quantityAvailable: { decrement: quantity },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Transfer order created',
        transfer: {
          itemId,
          fromLocationId,
          toLocationId,
          quantity,
          status: 'pending',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Sync inventory (from NetSuite)
router.get('/sync', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const locationId = req.user?.locationId;

    if (!locationId) {
      throw new ValidationError('No location assigned');
    }

    const inventory = await prisma.inventoryLevel.findMany({
      where: { locationId },
      include: {
        item: {
          select: {
            name: true,
            sku: true,
            barcode: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        inventory: inventory.map((inv) => ({
          itemId: inv.itemId,
          locationId: inv.locationId,
          quantityOnHand: Number(inv.quantityOnHand),
          quantityAvailable: Number(inv.quantityAvailable),
          quantityCommitted: Number(inv.quantityCommitted),
        })),
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
