import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './auth.js';
import { AuthorizationError, NotFoundError } from './errorHandler.js';

const prisma = new PrismaClient();

// Plan feature limits
export const PLAN_LIMITS = {
  TRIAL: {
    maxLocations: 1,
    maxRegisters: 1,
    maxUsers: 3,
    maxItems: 100,
    features: {
      offlineMode: false,
      advancedReports: false,
      netsuiteSync: false,
    },
  },
  STARTER: {
    maxLocations: 1,
    maxRegisters: 2,
    maxUsers: 5,
    maxItems: 500,
    features: {
      offlineMode: false,
      advancedReports: false,
      netsuiteSync: false,
    },
  },
  PROFESSIONAL: {
    maxLocations: 3,
    maxRegisters: 10,
    maxUsers: 20,
    maxItems: 5000,
    features: {
      offlineMode: true,
      advancedReports: true,
      netsuiteSync: false,
    },
  },
  ENTERPRISE: {
    maxLocations: -1, // unlimited
    maxRegisters: -1,
    maxUsers: -1,
    maxItems: -1,
    features: {
      offlineMode: true,
      advancedReports: true,
      netsuiteSync: true,
    },
  },
};

export type PlanType = keyof typeof PLAN_LIMITS;

// Middleware to check if tenant has access to a feature
export function requireFeature(feature: keyof typeof PLAN_LIMITS.TRIAL.features) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return next(new AuthorizationError('Tenant context required'));
    }

    const plan = req.tenant.plan as PlanType;
    const limits = PLAN_LIMITS[plan];

    if (!limits.features[feature]) {
      return next(
        new AuthorizationError(
          `This feature requires a higher plan. Please upgrade to access ${feature}.`
        )
      );
    }

    next();
  };
}

// Middleware to check plan limits before creating resources
export function checkPlanLimit(resourceType: 'locations' | 'registers' | 'users' | 'items') {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user?.tenantId || !req.tenant) {
      return next(new AuthorizationError('Tenant context required'));
    }

    const plan = req.tenant.plan as PlanType;
    const limits = PLAN_LIMITS[plan];

    let maxAllowed: number;
    let currentCount: number;

    switch (resourceType) {
      case 'locations':
        maxAllowed = limits.maxLocations;
        currentCount = await prisma.location.count({
          where: { tenantId: req.user.tenantId },
        });
        break;
      case 'registers':
        maxAllowed = limits.maxRegisters;
        currentCount = await prisma.register.count({
          where: { location: { tenantId: req.user.tenantId } },
        });
        break;
      case 'users':
        maxAllowed = limits.maxUsers;
        currentCount = await prisma.user.count({
          where: { tenantId: req.user.tenantId },
        });
        break;
      case 'items':
        maxAllowed = limits.maxItems;
        currentCount = await prisma.item.count({
          where: { tenantId: req.user.tenantId },
        });
        break;
      default:
        return next();
    }

    // -1 means unlimited
    if (maxAllowed !== -1 && currentCount >= maxAllowed) {
      return next(
        new AuthorizationError(
          `You have reached the maximum number of ${resourceType} allowed for your plan (${maxAllowed}). Please upgrade to add more.`
        )
      );
    }

    next();
  };
}

// Middleware to check subscription status
export async function requireActiveSubscription(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.tenant) {
    next(new AuthorizationError('Tenant context required'));
    return;
  }

  // Allow trial users
  if (req.tenant.plan === 'TRIAL') {
    // Check if trial has expired
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant.id },
      select: { planEndDate: true },
    });

    if (tenant?.planEndDate && new Date() > tenant.planEndDate) {
      next(
        new AuthorizationError(
          'Your trial has expired. Please subscribe to continue using the service.'
        )
      );
      return;
    }
  }

  next();
}

// Middleware to resolve tenant from subdomain
export async function resolveTenantFromSubdomain(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const host = req.headers.host || '';
    const appDomain = process.env.APP_DOMAIN || 'localhost:3000';

    // Extract subdomain from host
    // e.g., acme.yourpos.com -> acme
    let slug: string | null = null;

    if (host.includes(appDomain)) {
      const parts = host.replace(appDomain, '').split('.');
      if (parts.length > 0 && parts[0] !== '' && parts[0] !== 'www') {
        slug = parts[0];
      }
    }

    // Also check for slug in header (useful for development/testing)
    if (!slug) {
      slug = req.headers['x-tenant-slug'] as string | undefined || null;
    }

    if (slug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          isActive: true,
        },
      });

      if (!tenant) {
        next(new NotFoundError('Company not found'));
        return;
      }

      if (!tenant.isActive) {
        next(new AuthorizationError('This account has been deactivated'));
        return;
      }

      req.tenant = tenant;
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Helper to get tenant scoped prisma client
export function getTenantId(req: AuthenticatedRequest): string {
  if (!req.user?.tenantId) {
    throw new AuthorizationError('Tenant context required');
  }
  return req.user.tenantId;
}
