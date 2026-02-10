import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// Get all customers
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 100 } = req.query;

    const customers = await prisma.customer.findMany({
      take: Number(limit),
      orderBy: { lastName: 'asc' },
    });

    res.json({
      success: true,
      data: {
        customers: customers.map((c) => ({
          id: c.id,
          netsuiteId: c.netsuiteId,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          company: c.company,
          priceLevel: c.priceLevel,
          creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
          balance: Number(c.balance),
          loyaltyPoints: c.loyaltyPoints,
          taxExempt: c.taxExempt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Search customers
router.get('/search', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;

    if (!q || (q as string).length < 2) {
      res.json({ success: true, data: { customers: [] } });
      return;
    }

    const query = q as string;

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { company: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { lastName: 'asc' },
    });

    res.json({
      success: true,
      data: {
        customers: customers.map((c) => ({
          id: c.id,
          netsuiteId: c.netsuiteId,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          company: c.company,
          balance: Number(c.balance),
          loyaltyPoints: c.loyaltyPoints,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get customer by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          netsuiteId: customer.netsuiteId,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          company: customer.company,
          priceLevel: customer.priceLevel,
          creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
          balance: Number(customer.balance),
          loyaltyPoints: customer.loyaltyPoints,
          taxExempt: customer.taxExempt,
          notes: customer.notes,
          addresses: customer.addresses,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get customer transactions
router.get('/:id/transactions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    const transactions = await prisma.transaction.findMany({
      where: { customerId: id },
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
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
          subtotal: Number(t.subtotal),
          taxTotal: Number(t.taxTotal),
          discountTotal: Number(t.discountTotal),
          total: Number(t.total),
          createdAt: t.createdAt,
          items: t.items.map((item) => ({
            itemName: item.itemName,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal),
          })),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create customer
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phone, company } = req.body;

    if (!firstName || !lastName) {
      throw new ValidationError('First name and last name are required');
    }

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          netsuiteId: customer.netsuiteId,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          company: customer.company,
          balance: Number(customer.balance),
          loyaltyPoints: customer.loyaltyPoints,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update customer
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, company, notes } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        notes,
      },
    });

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          netsuiteId: customer.netsuiteId,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          company: customer.company,
          balance: Number(customer.balance),
          loyaltyPoints: customer.loyaltyPoints,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Sync customers (trigger sync from NetSuite)
router.get('/sync', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { lastName: 'asc' },
    });

    res.json({
      success: true,
      data: {
        customers: customers.map((c) => ({
          id: c.id,
          netsuiteId: c.netsuiteId,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          company: c.company,
          priceLevel: c.priceLevel,
          balance: Number(c.balance),
          loyaltyPoints: c.loyaltyPoints,
        })),
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
