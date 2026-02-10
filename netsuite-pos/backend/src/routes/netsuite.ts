import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NetSuiteClient } from '../services/netsuite/client.js';

const router = Router();

// Get NetSuite connection status
router.get('/status', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const client = new NetSuiteClient();
    const isConnected = await client.testConnection();

    res.json({
      success: true,
      data: {
        connected: isConnected,
        accountId: process.env.NETSUITE_ACCOUNT_ID || 'Not configured',
        lastSync: null, // Would be stored in database
      },
    });
  } catch (error) {
    next(error);
  }
});

// Trigger full sync from NetSuite
router.post('/sync', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type } = req.body; // 'items', 'customers', 'inventory', or 'all'
    const tenantId = req.user!.tenantId;
    const client = new NetSuiteClient(tenantId);

    const results: Record<string, unknown> = {};

    if (type === 'items' || type === 'all') {
      results.items = await client.syncItems();
    }

    if (type === 'customers' || type === 'all') {
      results.customers = await client.syncCustomers();
    }

    if (type === 'inventory' || type === 'all') {
      results.inventory = await client.syncInventory(req.user?.locationId);
    }

    res.json({
      success: true,
      data: {
        results,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Push transaction to NetSuite
router.post('/push/transaction', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { transactionId } = req.body;
    const tenantId = req.user!.tenantId;
    const client = new NetSuiteClient(tenantId);

    const result = await client.pushTransaction(transactionId);

    res.json({
      success: true,
      data: {
        netsuiteId: result.netsuiteId,
        tranId: result.tranId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Push customer to NetSuite
router.post('/push/customer', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.body;
    const tenantId = req.user!.tenantId;
    const client = new NetSuiteClient(tenantId);

    const result = await client.pushCustomer(customerId);

    res.json({
      success: true,
      data: {
        netsuiteId: result.netsuiteId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Webhook handler for NetSuite events
router.post('/webhook', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { event, data: _eventData } = req.body;

    // Handle different webhook events from NetSuite
    switch (event) {
      case 'item.updated':
        // Update local item data
        break;
      case 'customer.updated':
        // Update local customer data
        break;
      case 'inventory.updated':
        // Update local inventory levels
        break;
      default:
        console.log('Unknown webhook event:', event);
    }

    res.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
