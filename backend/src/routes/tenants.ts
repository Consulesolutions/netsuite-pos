import { Router, Response, NextFunction, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ValidationError, ConflictError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

// Register new tenant (company signup)
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      companyName,
      email,
      password,
      firstName,
      lastName,
      phone,
    } = req.body;

    // Validation
    if (!companyName || !email || !password || !firstName || !lastName) {
      throw new ValidationError('All fields are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Generate slug from company name
    let slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists, add number if needed
    let slugExists = await prisma.tenant.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${slug}-${counter}`;
      slugExists = await prisma.tenant.findUnique({ where: { slug } });
      counter++;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create tenant and owner user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          email,
          phone,
          plan: 'TRIAL',
          planStartDate: new Date(),
          planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        },
      });

      // Create default location
      const location = await tx.location.create({
        data: {
          tenantId: tenant.id,
          name: 'Main Store',
        },
      });

      // Create default register
      await tx.register.create({
        data: {
          locationId: location.id,
          name: 'Register 1',
        },
      });

      // Create owner user
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'OWNER',
          locationId: location.id,
        },
      });

      return { tenant, user, location };
    });

    // Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      {
        userId: result.user.id,
        tenantId: result.tenant.id,
        email: result.user.email,
        role: result.user.role,
      },
      secret,
      { expiresIn: '24h' }
    );

    logger.info(`New tenant registered: ${result.tenant.name} (${result.tenant.slug})`);

    res.status(201).json({
      success: true,
      data: {
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          plan: result.tenant.plan,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role.toLowerCase(),
        },
        token,
        appUrl: `https://${result.tenant.slug}.${process.env.APP_DOMAIN || 'localhost:3000'}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Check slug availability
router.get('/check-slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const existing = await prisma.tenant.findUnique({
      where: { slug },
    });

    res.json({
      success: true,
      data: {
        available: !existing,
        slug,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant by slug (for subdomain routing)
router.get('/by-slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        plan: true,
        isActive: true,
      },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
      });
      return;
    }

    if (!tenant.isActive) {
      res.status(403).json({
        success: false,
        error: 'This account has been deactivated',
      });
      return;
    }

    res.json({
      success: true,
      data: { tenant },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
