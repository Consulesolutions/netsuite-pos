  import crypto from 'crypto';                                                                                                      
  import OAuth from 'oauth-1.0a';                                                                                                   
  import { PrismaClient } from '@prisma/client';                                                                                    
  import { logger } from '../../utils/logger.js';                                                                                   
                                                                                                                                    
  const prisma = new PrismaClient();                                                                                                
                                                                                                                                    
  interface NetSuiteConfig {                                                                                                        
    accountId: string;                                                                                                              
    consumerKey: string;                                                                                                            
    consumerSecret: string;                                                                                                         
    tokenId: string;                                                                                                                
    tokenSecret: string;                                                                                                            
    restletUrl: string;                                                                                                             
  }                                                                                                                                 
                                                                                                                                    
  interface NetSuiteResponse<T> {                                                                                                   
    success: boolean;                                                                                                               
    data?: T;                                                                                                                       
    error?: string;                                                                                                                 
  }                                                                                                                                 
                                                                                                                                    
  export class NetSuiteClient {                                                                                                     
    private config: NetSuiteConfig;                                                                                                 
    private oauth: OAuth;                                                                                                           
    private tenantId?: string;                                                                                                      
                                                                                                                                    
    constructor(tenantId?: string) {                                                                                                
      this.tenantId = tenantId;                                                                                                     
      this.config = {                                                                                                               
        accountId: process.env.NETSUITE_ACCOUNT_ID || '',                                                                           
        consumerKey: process.env.NETSUITE_CONSUMER_KEY || '',                                                                       
        consumerSecret: process.env.NETSUITE_CONSUMER_SECRET || '',                                                                 
        tokenId: process.env.NETSUITE_TOKEN_ID || '',                                                                               
        tokenSecret: process.env.NETSUITE_TOKEN_SECRET || '',                                                                       
        restletUrl: process.env.NETSUITE_RESTLET_URL || '',                                                                         
      };                                                                                                                            
                                                                                                                                    
      this.oauth = new OAuth({                                                                                                      
        consumer: {                                                                                                                 
          key: this.config.consumerKey,                                                                                             
          secret: this.config.consumerSecret,                                                                                       
        },                                                                                                                          
        signature_method: 'HMAC-SHA256',                                                                                            
        hash_function(base_string, key) {                                                                                           
          return crypto                                                                                                             
            .createHmac('sha256', key)                                                                                              
            .update(base_string)                                                                                                    
            .digest('base64');                                                                                                      
        },                                                                                                                          
      });                                                                                                                           
    }                                                                                                                               
                                                                                                                                    
    private getAuthHeader(url: string, method: string): string {                                                                    
      const requestData = {                                                                                                         
        url,                                                                                                                        
        method,                                                                                                                     
      };                                                                                                                            
                                                                                                                                    
      const token = {                                                                                                               
        key: this.config.tokenId,                                                                                                   
        secret: this.config.tokenSecret,                                                                                            
      };                                                                                                                            
                                                                                                                                    
      const authorization = this.oauth.authorize(requestData, token);                                                               
      const realm = this.config.accountId.replace('-', '_').toUpperCase();                                                          
                                                                                                                                    
      const authParts = [                                                                                                           
        `OAuth realm="${realm}"`,                                                                                                   
        `oauth_consumer_key="${authorization.oauth_consumer_key}"`,                                                                 
        `oauth_token="${authorization.oauth_token}"`,                                                                               
        `oauth_signature_method="HMAC-SHA256"`,                                                                                     
        `oauth_timestamp="${authorization.oauth_timestamp}"`,                                                                       
        `oauth_nonce="${authorization.oauth_nonce}"`,                                                                               
        `oauth_version="1.0"`,                                                                                                      
        `oauth_signature="${encodeURIComponent(authorization.oauth_signature as string)}"`,                                         
      ];                                                                                                                            
                                                                                                                                    
      return authParts.join(', ');                                                                                                  
    }                                                                                                                               
                                                                                                                                    
    async testConnection(): Promise<boolean> {                                                                                      
      try {                                                                                                                         
        if (!this.config.restletUrl) {                                                                                              
          logger.warn('NetSuite RESTlet URL not configured');                                                                       
          return false;                                                                                                             
        }                                                                                                                           
                                                                                                                                    
        // In a real implementation, this would make an API call                                                                    
        // For now, just check if config is present                                                                                 
        return !!(                                                                                                                  
          this.config.accountId &&                                                                                                  
          this.config.consumerKey &&                                                                                                
          this.config.tokenId                                                                                                       
        );                                                                                                                          
      } catch (error) {                                                                                                             
        logger.error('NetSuite connection test failed:', error);                                                                    
        return false;                                                                                                               
      }                                                                                                                             
    }                                                                                                                               
                                                                                                                                    
    async request<T>(                                                                                                               
      action: string,                                                                                                               
      method: 'GET' | 'POST' = 'GET',                                                                                               
      data?: Record<string, unknown>                                                                                                
    ): Promise<NetSuiteResponse<T>> {                                                                                               
      try {                                                                                                                         
        const url = `${this.config.restletUrl}?action=${action}`;                                                                   
        const authHeader = this.getAuthHeader(url, method);                                                                         
                                                                                                                                    
        const response = await fetch(url, {                                                                                         
          method,                                                                                                                   
          headers: {                                                                                                                
            'Content-Type': 'application/json',                                                                                     
            Authorization: authHeader,                                                                                              
          },                                                                                                                        
          body: method === 'POST' ? JSON.stringify(data) : undefined,                                                               
        });                                                                                                                         
                                                                                                                                    
        if (!response.ok) {                                                                                                         
          throw new Error(`NetSuite API error: ${response.status}`);                                                                
        }                                                                                                                           
                                                                                                                                    
        const result = await response.json() as T;                                                                                  
        return { success: true, data: result };                                                                                     
      } catch (error) {                                                                                                             
        logger.error('NetSuite request failed:', error);                                                                            
        return {                                                                                                                    
          success: false,                                                                                                           
          error: error instanceof Error ? error.message : 'Unknown error',                                                          
        };                                                                                                                          
      }                                                                                                                             
    }                                                                                                                               
                                                                                                                                    
    async syncItems(): Promise<{ count: number }> {                                                                                 
      try {                                                                                                                         
        if (!this.tenantId) {                                                                                                       
          throw new Error('TenantId is required for item sync');                                                                    
        }                                                                                                                           
                                                                                                                                    
        const response = await this.request<{                                                                                       
          items: Array<{                                                                                                            
            internalId: string;                                                                                                     
            itemId: string;                                                                                                         
            displayName: string;                                                                                                    
            description: string;                                                                                                    
            upcCode: string;                                                                                                        
            salesPrice: number;                                                                                                     
            cost: number;                                                                                                           
            isInactive: boolean;                                                                                                    
          }>;                                                                                                                       
        }>('getItems');                                                                                                             
                                                                                                                                    
        if (!response.success || !response.data) {                                                                                  
          throw new Error(response.error || 'Failed to fetch items');                                                               
        }                                                                                                                           
                                                                                                                                    
        const items = response.data.items;                                                                                          
                                                                                                                                    
        for (const item of items) {                                                                                                 
          await prisma.item.upsert({                                                                                                
            where: {                                                                                                                
              tenantId_netsuiteId: {                                                                                                
                tenantId: this.tenantId,                                                                                            
                netsuiteId: item.internalId,                                                                                        
              },                                                                                                                    
            },                                                                                                                      
            update: {                                                                                                               
              sku: item.itemId,                                                                                                     
              name: item.displayName,                                                                                               
              description: item.description,                                                                                        
              barcode: item.upcCode,                                                                                                
              basePrice: item.salesPrice,                                                                                           
              cost: item.cost,                                                                                                      
              isActive: !item.isInactive,                                                                                           
              updatedAt: new Date(),                                                                                                
            },                                                                                                                      
            create: {                                                                                                               
              tenantId: this.tenantId,                                                                                              
              netsuiteId: item.internalId,                                                                                          
              sku: item.itemId,                                                                                                     
              name: item.displayName,                                                                                               
              description: item.description,                                                                                        
              barcode: item.upcCode,                                                                                                
              basePrice: item.salesPrice,                                                                                           
              cost: item.cost,                                                                                                      
              isActive: !item.isInactive,                                                                                           
            },                                                                                                                      
          });                                                                                                                       
        }                                                                                                                           
                                                                                                                                    
        logger.info(`Synced ${items.length} items from NetSuite`);                                                                  
        return { count: items.length };                                                                                             
      } catch (error) {                                                                                                             
        logger.error('Item sync failed:', error);                                                                                   
        throw error;                                                                                                                
      }                                                                                                                             
    }                                                                                                                               
                                                                                                                                    
    async syncCustomers(): Promise<{ count: number }> {                                                                             
      try {                                                                                                                         
        if (!this.tenantId) {                                                                                                       
          throw new Error('TenantId is required for customer sync');                                                                
        }                                                                                                                           
                                                                                                                                    
        const response = await this.request<{                                                                                       
          customers: Array<{                                                                                                        
            internalId: string;                                                                                                     
            entityId: string;                                                                                                       
            firstName: string;                                                                                                      
            lastName: string;                                                                                                       
            email: string;                                                                                                          
            phone: string;                                                                                                          
            companyName: string;                                                                                                    
            balance: number;                                                                                                        
          }>;                                                                                                                       
        }>('getCustomers');                                                                                                         
                                                                                                                                    
        if (!response.success || !response.data) {                                                                                  
          throw new Error(response.error || 'Failed to fetch customers');                                                           
        }                                                                                                                           
                                                                                                                                    
        const customers = response.data.customers;                                                                                  
                                                                                                                                    
        for (const customer of customers) {                                                                                         
          await prisma.customer.upsert({                                                                                            
            where: {                                                                                                                
              tenantId_netsuiteId: {                                                                                                
                tenantId: this.tenantId,                                                                                            
                netsuiteId: customer.internalId,                                                                                    
              },                                                                                                                    
            },                                                                                                                      
            update: {                                                                                                               
              firstName: customer.firstName,                                                                                        
              lastName: customer.lastName,                                                                                          
              email: customer.email,                                                                                                
              phone: customer.phone,                                                                                                
              company: customer.companyName,                                                                                        
              balance: customer.balance,                                                                                            
              updatedAt: new Date(),                                                                                                
            },                                                                                                                      
            create: {                                                                                                               
              tenantId: this.tenantId,                                                                                              
              netsuiteId: customer.internalId,                                                                                      
              firstName: customer.firstName,                                                                                        
              lastName: customer.lastName,                                                                                          
              email: customer.email,                                                                                                
              phone: customer.phone,                                                                                                
              company: customer.companyName,                                                                                        
              balance: customer.balance,                                                                                            
            },                                                                                                                      
          });                                                                                                                       
        }                                                                                                                           
                                                                                                                                    
        logger.info(`Synced ${customers.length} customers from NetSuite`);                                                          
        return { count: customers.length };                                                                                         
      } catch (error) {                                                                                                             
        logger.error('Customer sync failed:', error);                                                                               
        throw error;                                                                                                                
      }                                                                                                                             
    }                                                                                                                               
                                                                                                                                    
    async syncInventory(locationId?: string | null): Promise<{ count: number }> {                                                   
      try {                                                                                                                         
        const response = await this.request<{                                                                                       
          inventory: Array<{                                                                                                        
            itemId: string;                                                                                                         
            locationId: string;                                                                                                     
            quantityOnHand: number;                                                                                                 
            quantityAvailable: number;                                                                                              
            quantityCommitted: number;                                                                                              
          }>;                                                                                                                       
        }>('getInventory', 'GET');                                                                                                  
                                                                                                                                    
        if (!response.success || !response.data) {                                                                                  
          throw new Error(response.error || 'Failed to fetch inventory');                                                           
        }                                                                                                                           
                                                                                                                                    
        const inventory = response.data.inventory.filter(                                                                           
          (inv) => !locationId || inv.locationId === locationId                                                                     
        );                                                                                                                          
                                                                                                                                    
        for (const inv of inventory) {                                                                                              
          const item = await prisma.item.findFirst({                                                                                
            where: { netsuiteId: inv.itemId },                                                                                      
          });                                                                                                                       
                                                                                                                                    
          const location = await prisma.location.findFirst({                                                                        
            where: { netsuiteId: inv.locationId },                                                                                  
          });                                                                                                                       
                                                                                                                                    
          if (item && location) {                                                                                                   
            await prisma.inventoryLevel.upsert({                                                                                    
              where: {                                                                                                              
                itemId_locationId: {                                                                                                
                  itemId: item.id,                                                                                                  
                  locationId: location.id,                                                                                          
                },                                                                                                                  
              },                                                                                                                    
              update: {                                                                                                             
                quantityOnHand: inv.quantityOnHand,                                                                                 
                quantityAvailable: inv.quantityAvailable,                                                                           
                quantityCommitted: inv.quantityCommitted,                                                                           
                lastSyncedAt: new Date(),                                                                                           
              },                                                                                                                    
              create: {                                                                                                             
                itemId: item.id,                                                                                                    
                locationId: location.id,                                                                                            
                quantityOnHand: inv.quantityOnHand,                                                                                 
                quantityAvailable: inv.quantityAvailable,                                                                           
                quantityCommitted: inv.quantityCommitted,                                                                           
                lastSyncedAt: new Date(),                                                                                           
              },                                                                                                                    
            });                                                                                                                     
          }                                                                                                                         
        }                                                                                                                           
                                                                                                                                    
        logger.info(`Synced ${inventory.length} inventory records from NetSuite`);                                                  
        return { count: inventory.length };                                                                                         
      } catch (error) {                                                                                                             
        logger.error('Inventory sync failed:', error);                                                                              
        throw error;                                                                                                                
      }                                                                                                                             
    }                                                                                                                               
                                                                                                                                    
    async pushTransaction(transactionId: string): Promise<{                                                                         
      netsuiteId: string;                                                                                                           
      tranId: string;                                                                                                               
    }> {                                                                                                                            
      try {                                                                                                                         
        const transaction = await prisma.transaction.findUnique({                                                                   
          where: { id: transactionId },                                                                                             
          include: {                                                                                                                
            items: true,                                                                                                            
            payments: true,                                                                                                         
            customer: true,                                                                                                         
          },                                                                                                                        
        });                                                                                                                         
                                                                                                                                    
        if (!transaction) {                                                                                                         
          throw new Error('Transaction not found');                                                                                 
        }                                                                                                                           
                                                                                                                                    
        const response = await this.request<{                                                                                       
          internalId: string;                                                                                                       
          tranId: string;                                                                                                           
        }>('createCashSale', 'POST', {                                                                                              
          data: {                                                                                                                   
            entity: transaction.customer?.netsuiteId,                                                                               
            location: transaction.locationId,                                                                                       
            items: transaction.items.map((item) => ({                                                                               
              item: item.itemId,                                                                                                    
              quantity: Number(item.quantity),                                                                                      
              rate: Number(item.unitPrice),                                                                                         
            })),                                                                                                                    
            payments: transaction.payments.map((payment) => ({                                                                      
              method: payment.method,                                                                                               
              amount: Number(payment.amount),                                                                                       
            })),                                                                                                                    
            memo: `POS Transaction: ${transaction.receiptNumber}`,                                                                  
          },                                                                                                                        
        });                                                                                                                         
                                                                                                                                    
        if (!response.success || !response.data) {                                                                                  
          throw new Error(response.error || 'Failed to create transaction in NetSuite');                                            
        }                                                                                                                           
                                                                                                                                    
        // Update local transaction with NetSuite ID                                                                                
        await prisma.transaction.update({                                                                                           
          where: { id: transactionId },                                                                                             
          data: {                                                                                                                   
            netsuiteId: response.data.internalId,                                                                                   
            status: 'SYNCED',                                                                                                       
            syncedAt: new Date(),                                                                                                   
          },                                                                                                                        
        });                                                                                                                         
                                                                                                                                    
        logger.info(`Pushed transaction ${transactionId} to NetSuite: ${response.data.tranId}`);                                    
        return {                                                                                                                    
          netsuiteId: response.data.internalId,                                                                                     
          tranId: response.data.tranId,                                                                                             
        };                                                                                                                          
      } catch (error) {                                                                                                             
        logger.error('Transaction push failed:', error);                                                                            
        throw error;                                                                                                                
      }                                                                                                                             
    }                                                                                                                               
                                                                                                                                    
    async pushCustomer(customerId: string): Promise<{ netsuiteId: string }> {                                                       
      try {                                                                                                                         
        const customer = await prisma.customer.findUnique({                                                                         
          where: { id: customerId },                                                                                                
        });                                                                                                                         
                                                                                                                                    
        if (!customer) {                                                                                                            
          throw new Error('Customer not found');                                                                                    
        }                                                                                                                           
                                                                                                                                    
        const response = await this.request<{ internalId: string }>(                                                                
          'createCustomer',                                                                                                         
          'POST',                                                                                                                   
          {                                                                                                                         
            data: {                                                                                                                 
              firstName: customer.firstName,                                                                                        
              lastName: customer.lastName,                                                                                          
              email: customer.email,                                                                                                
              phone: customer.phone,                                                                                                
              company: customer.company,                                                                                            
            },                                                                                                                      
          }                                                                                                                         
        );                                                                                                                          
                                                                                                                                    
        if (!response.success || !response.data) {                                                                                  
          throw new Error(response.error || 'Failed to create customer in NetSuite');                                               
        }                                                                                                                           
                                                                                                                                    
        // Update local customer with NetSuite ID                                                                                   
        await prisma.customer.update({                                                                                              
          where: { id: customerId },                                                                                                
          data: {                                                                                                                   
            netsuiteId: response.data.internalId,                                                                                   
          },                                                                                                                        
        });                                                                                                                         
                                                                                                                                    
        logger.info(`Pushed customer ${customerId} to NetSuite: ${response.data.internalId}`);                                      
        return { netsuiteId: response.data.internalId };                                                                            
      } catch (error) {                                                                                                             
        logger.error('Customer push failed:', error);                                                                               
        throw error;                                                                                                                
      }                                                                                                                             
    }                                                                                                                               
  }                                                                                                                                 
    
