import { Router, Response, NextFunction, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

// Only initialize Stripe if key is configured
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  : null;

// Pricing plans
const PLANS = {
  STARTER: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    price: 49,
    features: {
      locations: 1,
      registers: 2,
      users: 5,
      items: 500,
      offlineMode: false,
      advancedReports: false,
      netsuiteSync: false,
    },
  },
  PROFESSIONAL: {
    name: 'Professional',
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    price: 99,
    features: {
      locations: 3,
      registers: 10,
      users: 20,
      items: 5000,
      offlineMode: true,
      advancedReports: true,
      netsuiteSync: false,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    price: 249,
    features: {
      locations: -1, // unlimited
      registers: -1,
      users: -1,
      items: -1,
      offlineMode: true,
      advancedReports: true,
      netsuiteSync: true,
    },
  },
};

// Get available plans
router.get('/plans', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      plans: Object.entries(PLANS).map(([key, plan]) => ({
        id: key,
        ...plan,
      })),
    },
  });
});

// Get current subscription
router.get('/subscription', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const tenant = user.tenant;
    let subscription = null;

    if (stripe && tenant.stripeSubscriptionId) {
      subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
    }

    res.json({
      success: true,
      data: {
        plan: tenant.plan,
        planStartDate: tenant.planStartDate,
        planEndDate: tenant.planEndDate,
        subscription: subscription ? {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create checkout session
router.post('/checkout', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      throw new ValidationError('Billing is not configured');
    }

    const { planId } = req.body;

    if (!planId || !PLANS[planId as keyof typeof PLANS]) {
      throw new ValidationError('Invalid plan');
    }

    const plan = PLANS[planId as keyof typeof PLANS];

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create or get Stripe customer
    let customerId = user.tenant.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.tenant.name,
        metadata: {
          tenantId: user.tenantId,
        },
      });

      customerId = customer.id;

      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/settings/billing?canceled=true`,
      metadata: {
        tenantId: user.tenantId,
        planId,
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create customer portal session
router.post('/portal', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      throw new ValidationError('Billing is not configured');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { tenant: true },
    });

    if (!user || !user.tenant.stripeCustomerId) {
      throw new NotFoundError('No billing account found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.tenant.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings/billing`,
    });

    res.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  if (!stripe) {
    res.status(400).send('Billing not configured');
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Stripe webhook secret not configured');
    res.status(400).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', error);
    next(error);
  }
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId;
  const planId = session.metadata?.planId;

  if (!tenantId || !planId) {
    logger.error('Missing metadata in checkout session');
    return;
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan: planId as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
      stripeSubscriptionId: session.subscription as string,
      planStartDate: new Date(),
    },
  });

  logger.info(`Tenant ${tenantId} upgraded to ${planId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenant = await prisma.tenant.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!tenant) {
    logger.error(`Tenant not found for subscription ${subscription.id}`);
    return;
  }

  // Update plan end date
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      planEndDate: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
    },
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const tenant = await prisma.tenant.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!tenant) {
    logger.error(`Tenant not found for subscription ${subscription.id}`);
    return;
  }

  // Downgrade to trial/free
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      plan: 'TRIAL',
      stripeSubscriptionId: null,
      planEndDate: new Date(),
    },
  });

  logger.info(`Tenant ${tenant.id} subscription canceled`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!tenant) {
    return;
  }

  // Send notification (email, in-app notification, etc.)
  logger.warn(`Payment failed for tenant ${tenant.id}`);
}

export default router;
