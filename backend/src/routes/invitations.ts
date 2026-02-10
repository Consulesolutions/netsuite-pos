import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Validate invitation token (public)
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new ValidationError('Invitation has already been accepted');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ValidationError('Invitation has expired');
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        tenant: invitation.tenant,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Accept invitation and create user account (public)
router.post('/:token/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { password, firstName, lastName } = req.body;

    if (!password || !firstName || !lastName) {
      throw new ValidationError('Password, first name, and last name are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        tenant: true,
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new ValidationError('Invitation has already been accepted');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ValidationError('Invitation has expired');
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findFirst({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new ValidationError('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        passwordHash,
        firstName,
        lastName,
        role: invitation.role,
        tenantId: invitation.tenantId,
        onboardingStep: invitation.role === 'OWNER' ? 0 : 100, // Owners need onboarding
        onboardingComplete: invitation.role !== 'OWNER',
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    // Generate JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const jwtToken = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.toLowerCase(),
          onboardingStep: user.onboardingStep,
          onboardingComplete: user.onboardingComplete,
        },
        tenant: user.tenant,
        token: jwtToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Tenant user invitation routes (protected - for Customer Admins)
router.use('/tenant', authMiddleware);

// Customer Admin invites team members
router.post('/tenant/invite', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, role, locationId } = req.body;

    if (!email || !role) {
      throw new ValidationError('Email and role are required');
    }

    if (!['ADMIN', 'MANAGER', 'CASHIER'].includes(role)) {
      throw new ValidationError('Role must be ADMIN, MANAGER, or CASHIER');
    }

    // Only OWNER and ADMIN can invite
    if (!['OWNER', 'ADMIN'].includes(req.user!.role)) {
      throw new ValidationError('Only admins can invite team members');
    }

    // ADMIN cannot invite OWNER
    if (req.user!.role === 'ADMIN' && role === 'OWNER') {
      throw new ValidationError('Admins cannot invite owners');
    }

    const tenantId = req.user!.tenantId;

    // Check if user already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      throw new ValidationError('User already exists in this organization');
    }

    // Check for pending invitation
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

    // Verify location if provided
    if (locationId) {
      const location = await prisma.location.findFirst({
        where: { id: locationId, tenantId },
      });

      if (!location) {
        throw new ValidationError('Location not found');
      }
    }

    // Create invitation
    const crypto = await import('crypto');
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
      const { sendInvitationEmail } = await import('../services/email.js');
      await sendInvitationEmail({
        to: email,
        inviterName: `${req.user!.firstName} ${req.user!.lastName}`,
        companyName: req.tenant!.name,
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

// List team invitations
router.get('/tenant/list', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!['OWNER', 'ADMIN'].includes(req.user!.role)) {
      throw new ValidationError('Only admins can view invitations');
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        tenantId: req.user!.tenantId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
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

// Revoke invitation
router.delete('/tenant/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!['OWNER', 'ADMIN'].includes(req.user!.role)) {
      throw new ValidationError('Only admins can revoke invitations');
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id,
        tenantId: req.user!.tenantId,
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new ValidationError('Cannot revoke an accepted invitation');
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

// Update onboarding step
router.patch('/tenant/onboarding', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { step, complete } = req.body;

    const updateData: any = {};

    if (typeof step === 'number') {
      updateData.onboardingStep = step;
    }

    if (typeof complete === 'boolean') {
      updateData.onboardingComplete = complete;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        onboardingStep: true,
        onboardingComplete: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
