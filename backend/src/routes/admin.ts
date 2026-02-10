import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { authMiddleware, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { sendInvitationEmail } from '../services/email.js';

const router = Router();
const prisma = new PrismaClient();

// All routes require Super Admin authentication
router.use(authMiddleware);
router.use(requireSuperAdmin);

// Get system statistics
router.get('/stats', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalTransactions,
      pendingInvitations,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.user.count({ where: { tenantId: { not: null } } }),
      prisma.transaction.count(),
      prisma.invitation.count({ where: { acceptedAt: null, expiresAt: { gt: new Date() } } }),
    ]);

    // Get tenants by plan
    const tenantsByPlan = await prisma.tenant.groupBy({
      by: ['plan'],
      _count: { id: true },
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await prisma.transaction.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const newTenants = await prisma.tenant.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    res.json({
      success: true,
      data: {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          byPlan: tenantsByPlan.reduce((acc, curr) => {
            acc[curr.plan] = curr._count.id;
            return acc;
          }, {} as Record<string, number>),
          newLast30Days: newTenants,
        },
        users: {
          total: totalUsers,
        },
        transactions: {
          total: totalTransactions,
          last30Days: recentTransactions,
        },
        invitations: {
          pending: pendingInvitations,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// List all tenants
router.get('/tenants', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { search, plan, status, page = '1', limit = '20' } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (plan) {
      where.plan = plan;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              locations: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tenants: tenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          email: t.email,
          phone: t.phone,
          plan: t.plan,
          isActive: t.isActive,
          createdAt: t.createdAt,
          planStartDate: t.planStartDate,
          planEndDate: t.planEndDate,
          stats: {
            users: t._count.users,
            locations: t._count.locations,
            transactions: t._count.transactions,
          },
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single tenant details
router.get('/tenants/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        locations: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: {
              select: { registers: true },
            },
          },
        },
        invitations: {
          where: { acceptedAt: null },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            items: true,
            customers: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    res.json({
      success: true,
      data: {
        ...tenant,
        stats: tenant._count,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create new tenant (and send invitation to owner)
router.post('/tenants', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, plan = 'TRIAL', slug } = req.body;

    if (!name || !email || !slug) {
      throw new ValidationError('Name, email, and slug are required');
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new ValidationError('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if slug is taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ValidationError('Slug is already taken');
    }

    // Check if email already has an invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new ValidationError('An invitation is already pending for this email');
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        email,
        phone,
        slug,
        plan,
        settings: {
          currency: 'USD',
          timezone: 'America/New_York',
        },
      },
    });

    // Create invitation for the owner
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        role: 'OWNER',
        tenantId: tenant.id,
        expiresAt,
        createdById: req.user!.id,
      },
    });

    // Send invitation email
    try {
      await sendInvitationEmail({
        to: email,
        inviterName: `${req.user!.firstName} ${req.user!.lastName}`,
        companyName: name,
        role: 'OWNER',
        inviteToken: token,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request, just log the error
    }

    res.status(201).json({
      success: true,
      data: {
        tenant,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update tenant
router.patch('/tenants/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, plan, isActive, planEndDate } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(plan && { plan }),
        ...(isActive !== undefined && { isActive }),
        ...(planEndDate && { planEndDate: new Date(planEndDate) }),
      },
    });

    res.json({
      success: true,
      data: updatedTenant,
    });
  } catch (error) {
    next(error);
  }
});

// Send invitation to become a Customer Admin for a tenant
router.post('/invitations', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, tenantId, role = 'OWNER' } = req.body;

    if (!email || !tenantId) {
      throw new ValidationError('Email and tenantId are required');
    }

    if (!['OWNER', 'ADMIN'].includes(role)) {
      throw new ValidationError('Role must be OWNER or ADMIN');
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Check if user already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      throw new ValidationError('User already exists in this tenant');
    }

    // Check if invitation already pending
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        tenantId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new ValidationError('An invitation is already pending for this email');
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        role,
        tenantId,
        expiresAt,
        createdById: req.user!.id,
      },
    });

    // Send email
    try {
      await sendInvitationEmail({
        to: email,
        inviterName: `${req.user!.firstName} ${req.user!.lastName}`,
        companyName: tenant.name,
        role,
        inviteToken: token,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    res.status(201).json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// List all pending invitations
router.get('/invitations', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status = 'pending' } = req.query;

    const where: any = {};

    if (status === 'pending') {
      where.acceptedAt = null;
      where.expiresAt = { gt: new Date() };
    } else if (status === 'accepted') {
      where.acceptedAt = { not: null };
    } else if (status === 'expired') {
      where.acceptedAt = null;
      where.expiresAt = { lt: new Date() };
    }

    const invitations = await prisma.invitation.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
});

// Delete/revoke invitation
router.delete('/invitations/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new ValidationError('Cannot delete an accepted invitation');
    }

    await prisma.invitation.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Invitation revoked',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
