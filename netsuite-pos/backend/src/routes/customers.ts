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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      const customers = await prisma.customer.findMany({                                                                            
        where: { tenantId },                                                                                                        
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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      if (!q || (q as string).length < 2) {                                                                                         
        res.json({ success: true, data: { customers: [] } });                                                                       
        return;                                                                                                                     
      }                                                                                                                             
                                                                                                                                    
      const query = q as string;                                                                                                    
                                                                                                                                    
      const customers = await prisma.customer.findMany({                                                                            
        where: {                                                                                                                    
          tenantId,                                                                                                                 
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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      const customer = await prisma.customer.findFirst({                                                                            
        where: { id, tenantId },                                                                                                    
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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      const transactions = await prisma.transaction.findMany({                                                                      
        where: { customerId: id, tenantId },                                                                                        
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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      if (!firstName || !lastName) {                                                                                                
        throw new ValidationError('First name and last name are required');                                                         
      }                                                                                                                             
                                                                                                                                    
      const customer = await prisma.customer.create({                                                                               
        data: {                                                                                                                     
          tenantId,                                                                                                                 
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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      // Verify customer belongs to tenant                                                                                          
      const existing = await prisma.customer.findFirst({                                                                            
        where: { id, tenantId },                                                                                                    
      });                                                                                                                           
                                                                                                                                    
      if (!existing) {                                                                                                              
        throw new NotFoundError('Customer not found');                                                                              
      }                                                                                                                             
                                                                                                                                    
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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      const customers = await prisma.customer.findMany({                                                                            
        where: { tenantId },                                                                                                        
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
                                                                                                                                    
  Let me know when done, and I'll give you the next file.                                                                           
                                                                                                                                    
❯ done                                                                                                                              
                                                                                                                                    
⏺ File 3: netsuite-pos/backend/src/routes/inventory.ts                                                                              
                                                                                                                                    
  Go to: https://github.com/Consulesolutions/netsuite-pos/edit/main/netsuite-pos/backend/src/routes/inventory.ts                    
                                                                                                                                    
  Replace the ENTIRE content with:                                                                                                  
                                                                                                                                    
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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
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
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
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
