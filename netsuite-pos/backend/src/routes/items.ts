  Replace the ENTIRE content with:                                                                                                  
                                                                                                                                    
  import { Router, Response, NextFunction } from 'express';                                                                         
  import { PrismaClient } from '@prisma/client';                                                                                    
  import { AuthenticatedRequest } from '../middleware/auth.js';                                                                     
  import { NotFoundError } from '../middleware/errorHandler.js';                                                                    
                                                                                                                                    
  const router = Router();                                                                                                          
  const prisma = new PrismaClient();                                                                                                
                                                                                                                                    
  // Get all items                                                                                                                  
  router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                         
    try {                                                                                                                           
      const { category, search, active } = req.query;                                                                               
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      const where: Record<string, unknown> = { tenantId };                                                                          
                                                                                                                                    
      if (category) {                                                                                                               
        where.categoryId = category as string;                                                                                      
      }                                                                                                                             
                                                                                                                                    
      if (search) {                                                                                                                 
        where.OR = [                                                                                                                
          { name: { contains: search as string, mode: 'insensitive' } },                                                            
          { sku: { contains: search as string, mode: 'insensitive' } },                                                             
          { barcode: { contains: search as string, mode: 'insensitive' } },                                                         
        ];                                                                                                                          
      }                                                                                                                             
                                                                                                                                    
      if (active !== undefined) {                                                                                                   
        where.isActive = active === 'true';                                                                                         
      }                                                                                                                             
                                                                                                                                    
      const items = await prisma.item.findMany({                                                                                    
        where,                                                                                                                      
        include: {                                                                                                                  
          category: true,                                                                                                           
          priceLevels: true,                                                                                                        
        },                                                                                                                          
        orderBy: { name: 'asc' },                                                                                                   
      });                                                                                                                           
                                                                                                                                    
      res.json({                                                                                                                    
        success: true,                                                                                                              
        data: {                                                                                                                     
          items: items.map((item) => ({                                                                                             
            id: item.id,                                                                                                            
            netsuiteId: item.netsuiteId,                                                                                            
            sku: item.sku,                                                                                                          
            name: item.name,                                                                                                        
            description: item.description,                                                                                          
            barcode: item.barcode,                                                                                                  
            category: item.category?.name,                                                                                          
            basePrice: Number(item.basePrice),                                                                                      
            cost: item.cost ? Number(item.cost) : null,                                                                             
            taxRate: item.taxRate ? Number(item.taxRate) : null,                                                                    
            trackInventory: item.trackInventory,                                                                                    
            isActive: item.isActive,                                                                                                
            imageUrl: item.imageUrl,                                                                                                
            unit: item.unit,                                                                                                        
            requiresWeight: item.requiresWeight,                                                                                    
          })),                                                                                                                      
        },                                                                                                                          
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  // Get item by ID                                                                                                                 
  router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                      
    try {                                                                                                                           
      const { id } = req.params;                                                                                                    
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      const item = await prisma.item.findFirst({                                                                                    
        where: { id, tenantId },                                                                                                    
        include: {                                                                                                                  
          category: true,                                                                                                           
          priceLevels: true,                                                                                                        
          inventory: {                                                                                                              
            where: {                                                                                                                
              locationId: req.user?.locationId || undefined,                                                                        
            },                                                                                                                      
          },                                                                                                                        
        },                                                                                                                          
      });                                                                                                                           
                                                                                                                                    
      if (!item) {                                                                                                                  
        throw new NotFoundError('Item not found');                                                                                  
      }                                                                                                                             
                                                                                                                                    
      res.json({                                                                                                                    
        success: true,                                                                                                              
        data: {                                                                                                                     
          item: {                                                                                                                   
            id: item.id,                                                                                                            
            netsuiteId: item.netsuiteId,                                                                                            
            sku: item.sku,                                                                                                          
            name: item.name,                                                                                                        
            description: item.description,                                                                                          
            barcode: item.barcode,                                                                                                  
            category: item.category?.name,                                                                                          
            basePrice: Number(item.basePrice),                                                                                      
            cost: item.cost ? Number(item.cost) : null,                                                                             
            taxRate: item.taxRate ? Number(item.taxRate) : null,                                                                    
            trackInventory: item.trackInventory,                                                                                    
            isActive: item.isActive,                                                                                                
            imageUrl: item.imageUrl,                                                                                                
            unit: item.unit,                                                                                                        
            requiresWeight: item.requiresWeight,                                                                                    
            inventory: item.inventory[0] ? {                                                                                        
              quantityOnHand: Number(item.inventory[0].quantityOnHand),                                                             
              quantityAvailable: Number(item.inventory[0].quantityAvailable),                                                       
              quantityCommitted: Number(item.inventory[0].quantityCommitted),                                                       
            } : null,                                                                                                               
          },                                                                                                                        
        },                                                                                                                          
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  // Get item by barcode                                                                                                            
  router.get('/barcode/:barcode', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                         
    try {                                                                                                                           
      const { barcode } = req.params;                                                                                               
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      const item = await prisma.item.findFirst({                                                                                    
        where: { tenantId, barcode, isActive: true },                                                                               
        include: {                                                                                                                  
          category: true,                                                                                                           
        },                                                                                                                          
      });                                                                                                                           
                                                                                                                                    
      if (!item) {                                                                                                                  
        throw new NotFoundError('Item not found');                                                                                  
      }                                                                                                                             
                                                                                                                                    
      res.json({                                                                                                                    
        success: true,                                                                                                              
        data: {                                                                                                                     
          item: {                                                                                                                   
            id: item.id,                                                                                                            
            netsuiteId: item.netsuiteId,                                                                                            
            sku: item.sku,                                                                                                          
            name: item.name,                                                                                                        
            description: item.description,                                                                                          
            barcode: item.barcode,                                                                                                  
            category: item.category?.name,                                                                                          
            basePrice: Number(item.basePrice),                                                                                      
            isActive: item.isActive,                                                                                                
            imageUrl: item.imageUrl,                                                                                                
            unit: item.unit,                                                                                                        
            requiresWeight: item.requiresWeight,                                                                                    
          },                                                                                                                        
        },                                                                                                                          
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  // Get item by SKU                                                                                                                
  router.get('/sku/:sku', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                 
    try {                                                                                                                           
      const { sku } = req.params;                                                                                                   
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      const item = await prisma.item.findFirst({                                                                                    
        where: { tenantId, sku: { equals: sku, mode: 'insensitive' }, isActive: true },                                             
        include: {                                                                                                                  
          category: true,                                                                                                           
        },                                                                                                                          
      });                                                                                                                           
                                                                                                                                    
      if (!item) {                                                                                                                  
        throw new NotFoundError('Item not found');                                                                                  
      }                                                                                                                             
                                                                                                                                    
      res.json({                                                                                                                    
        success: true,                                                                                                              
        data: {                                                                                                                     
          item: {                                                                                                                   
            id: item.id,                                                                                                            
            netsuiteId: item.netsuiteId,                                                                                            
            sku: item.sku,                                                                                                          
            name: item.name,                                                                                                        
            description: item.description,                                                                                          
            barcode: item.barcode,                                                                                                  
            category: item.category?.name,                                                                                          
            basePrice: Number(item.basePrice),                                                                                      
            isActive: item.isActive,                                                                                                
            imageUrl: item.imageUrl,                                                                                                
            unit: item.unit,                                                                                                        
            requiresWeight: item.requiresWeight,                                                                                    
          },                                                                                                                        
        },                                                                                                                          
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  // Sync items (trigger sync from NetSuite)                                                                                        
  router.get('/sync', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                     
    try {                                                                                                                           
      const tenantId = req.user!.tenantId;                                                                                          
                                                                                                                                    
      // This would trigger a sync from NetSuite                                                                                    
      // For now, just return all items                                                                                             
      const items = await prisma.item.findMany({                                                                                    
        where: { tenantId, isActive: true },                                                                                        
        include: {                                                                                                                  
          category: true,                                                                                                           
        },                                                                                                                          
        orderBy: { name: 'asc' },                                                                                                   
      });                                                                                                                           
                                                                                                                                    
      res.json({                                                                                                                    
        success: true,                                                                                                              
        data: {                                                                                                                     
          items: items.map((item) => ({                                                                                             
            id: item.id,                                                                                                            
            netsuiteId: item.netsuiteId,                                                                                            
            sku: item.sku,                                                                                                          
            name: item.name,                                                                                                        
            description: item.description,                                                                                          
            barcode: item.barcode,                                                                                                  
            category: item.category?.name,                                                                                          
            basePrice: Number(item.basePrice),                                                                                      
            cost: item.cost ? Number(item.cost) : null,                                                                             
            trackInventory: item.trackInventory,                                                                                    
            isActive: item.isActive,                                                                                                
            imageUrl: item.imageUrl,                                                                                                
            unit: item.unit,                                                                                                        
            requiresWeight: item.requiresWeight,                                                                                    
          })),                                                                                                                      
          syncedAt: new Date().toISOString(),                                                                                       
        },                                                                                                                          
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  export default router; 
