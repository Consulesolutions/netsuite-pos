import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    locationId?: string | null;
    onboardingStep?: number;
    onboardingComplete?: boolean;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive: boolean;
  } | null;
}

export interface JWTPayload {
  userId: string;
  tenantId: string | null;
  email: string;
  role: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locationId: true,
        isActive: true,
        onboardingStep: true,
        onboardingComplete: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // SUPER_ADMIN users don't have a tenant
    if (user.role === 'SUPER_ADMIN') {
      req.user = {
        id: user.id,
        tenantId: null,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locationId: user.locationId,
        onboardingStep: user.onboardingStep,
        onboardingComplete: user.onboardingComplete,
      };
      req.tenant = null;
      next();
      return;
    }

    // For regular users, require active tenant
    if (!user.tenant || !user.tenant.isActive) {
      throw new AuthenticationError('Account has been deactivated');
    }

    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      locationId: user.locationId,
      onboardingStep: user.onboardingStep,
      onboardingComplete: user.onboardingComplete,
    };
    req.tenant = user.tenant;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else {
      next(error);
    }
  }
}

// Middleware to require SUPER_ADMIN role
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new AuthenticationError());
    return;
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    next(new AuthorizationError('Super Admin access required'));
    return;
  }

  next();
}

// Middleware to require tenant (blocks SUPER_ADMIN from tenant-specific routes)
export function requireTenant(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user?.tenantId || !req.tenant) {
    next(new AuthorizationError('Tenant context required'));
    return;
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
}

export function requireLocation(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user?.locationId) {
    next(new AuthorizationError('No location assigned'));
    return;
  }
  next();
}
