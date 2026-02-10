import { Router, Request, Response, NextFunction } from 'express';                                                                
  import bcrypt from 'bcryptjs';                                                                                                    
  import jwt from 'jsonwebtoken';                                                                                                   
  import { PrismaClient } from '@prisma/client';                                                                                    
  import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';                                                     
  import { ValidationError, AuthenticationError } from '../middleware/errorHandler.js';                                             
                                                                                                                                    
  const router = Router();                                                                                                          
  const prisma = new PrismaClient();                                                                                                
                                                                                                                                    
  // Login                                                                                                                          
  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {                                                
    try {                                                                                                                           
      const { email, password, tenantSlug } = req.body;                                                                             
                                                                                                                                    
      if (!email || !password) {                                                                                                    
        throw new ValidationError('Email and password are required');                                                               
      }                                                                                                                             
                                                                                                                                    
      // Build query based on whether tenant slug is provided                                                                       
      let user;                                                                                                                     
      if (tenantSlug) {                                                                                                             
        // Find tenant first                                                                                                        
        const tenant = await prisma.tenant.findUnique({                                                                             
          where: { slug: tenantSlug },                                                                                              
        });                                                                                                                         
                                                                                                                                    
        if (!tenant || !tenant.isActive) {                                                                                          
          throw new AuthenticationError('Invalid credentials');                                                                     
        }                                                                                                                           
                                                                                                                                    
        user = await prisma.user.findFirst({                                                                                        
          where: {                                                                                                                  
            email,                                                                                                                  
            tenantId: tenant.id,                                                                                                    
          },                                                                                                                        
          include: {                                                                                                                
            location: true,                                                                                                         
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
      } else {                                                                                                                      
        // If no tenant slug, find by email (for single-tenant or first match)                                                      
        user = await prisma.user.findFirst({                                                                                        
          where: { email },                                                                                                         
          include: {                                                                                                                
            location: true,                                                                                                         
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
      }                                                                                                                             
                                                                                                                                    
      if (!user || !user.isActive) {                                                                                                
        throw new AuthenticationError('Invalid credentials');                                                                       
      }                                                                                                                             
                                                                                                                                    
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);                                                    
      if (!isValidPassword) {                                                                                                       
        throw new AuthenticationError('Invalid credentials');                                                                       
      }                                                                                                                             
                                                                                                                                    
      // Get current shift if any                                                                                                   
      const shift = await prisma.shift.findFirst({                                                                                  
        where: {                                                                                                                    
          userId: user.id,                                                                                                          
          status: 'OPEN',                                                                                                           
        },                                                                                                                          
        include: {                                                                                                                  
          register: true,                                                                                                           
        },                                                                                                                          
      });                                                                                                                           
                                                                                                                                    
      const secret = process.env.JWT_SECRET;                                                                                        
      if (!secret) {                                                                                                                
        throw new Error('JWT_SECRET not configured');                                                                               
      }                                                                                                                             
                                                                                                                                    
      const token = jwt.sign(                                                                                                       
        {                                                                                                                           
          userId: user.id,                                                                                                          
          tenantId: user.tenantId,                                                                                                  
          email: user.email,                                                                                                        
          role: user.role,                                                                                                          
        },                                                                                                                          
        secret,                                                                                                                     
        { expiresIn: '24h' }                                                                                                        
      );                                                                                                                            
                                                                                                                                    
      // Update last login                                                                                                          
      await prisma.user.update({                                                                                                    
        where: { id: user.id },                                                                                                     
        data: { lastLoginAt: new Date() },                                                                                          
      });                                                                                                                           
                                                                                                                                    
      res.json({                                                                                                                    
        success: true,                                                                                                              
        data: {                                                                                                                     
          user: {                                                                                                                   
            id: user.id,                                                                                                            
            email: user.email,                                                                                                      
            firstName: user.firstName,                                                                                              
            lastName: user.lastName,                                                                                                
            role: user.role.toLowerCase(),                                                                                          
            locationId: user.locationId,                                                                                            
          },                                                                                                                        
          tenant: user.tenant,                                                                                                      
          token,                                                                                                                    
          location: user.location,                                                                                                  
          register: shift?.register || null,                                                                                        
          shift: shift ? {                                                                                                          
            id: shift.id,                                                                                                           
            registerId: shift.registerId,                                                                                           
            startTime: shift.startTime,                                                                                             
            openingBalance: shift.openingBalance,                                                                                   
            status: shift.status.toLowerCase(),                                                                                     
          } : null,                                                                                                                 
        },                                                                                                                          
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  // Logout                                                                                                                         
  router.post('/logout', authMiddleware, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {                 
    try {                                                                                                                           
      res.json({                                                                                                                    
        success: true,                                                                                                              
        message: 'Logged out successfully',                                                                                         
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  // Get current user                                                                                                               
  router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                       
    try {                                                                                                                           
      const user = await prisma.user.findUnique({                                                                                   
        where: { id: req.user!.id },                                                                                                
        include: {                                                                                                                  
          location: true,                                                                                                           
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
                                                                                                                                    
      if (!user) {                                                                                                                  
        throw new AuthenticationError('User not found');                                                                            
      }                                                                                                                             
                                                                                                                                    
      // Get current shift if any                                                                                                   
      const shift = await prisma.shift.findFirst({                                                                                  
        where: {                                                                                                                    
          userId: user.id,                                                                                                          
          status: 'OPEN',                                                                                                           
        },                                                                                                                          
        include: {                                                                                                                  
          register: true,                                                                                                           
        },                                                                                                                          
      });                                                                                                                           
                                                                                                                                    
      res.json({                                                                                                                    
        success: true,                                                                                                              
        data: {                                                                                                                     
          user: {                                                                                                                   
            id: user.id,                                                                                                            
            email: user.email,                                                                                                      
            firstName: user.firstName,                                                                                              
            lastName: user.lastName,                                                                                                
            role: user.role.toLowerCase(),                                                                                          
            locationId: user.locationId,                                                                                            
          },                                                                                                                        
          tenant: user.tenant,                                                                                                      
          location: user.location,                                                                                                  
          register: shift?.register || null,                                                                                        
          shift: shift ? {                                                                                                          
            id: shift.id,                                                                                                           
            registerId: shift.registerId,                                                                                           
            startTime: shift.startTime,                                                                                             
            openingBalance: shift.openingBalance,                                                                                   
            status: shift.status.toLowerCase(),                                                                                     
          } : null,                                                                                                                 
        },                                                                                                                          
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  // Refresh token                                                                                                                  
  router.post('/refresh', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                 
    try {                                                                                                                           
      const secret = process.env.JWT_SECRET;                                                                                        
      if (!secret) {                                                                                                                
        throw new Error('JWT_SECRET not configured');                                                                               
      }                                                                                                                             
                                                                                                                                    
      const token = jwt.sign(                                                                                                       
        {                                                                                                                           
          userId: req.user!.id,                                                                                                     
          tenantId: req.user!.tenantId,                                                                                             
          email: req.user!.email,                                                                                                   
          role: req.user!.role,                                                                                                     
        },                                                                                                                          
        secret,                                                                                                                     
        { expiresIn: '24h' }                                                                                                        
      );                                                                                                                            
                                                                                                                                    
      res.json({                                                                                                                    
        success: true,                                                                                                              
        data: { token },                                                                                                            
      });                                                                                                                           
    } catch (error) {                                                                                                               
      next(error);                                                                                                                  
    }                                                                                                                               
  });                                                                                                                               
                                                                                                                                    
  export default router;             
