# Build stage                                                                                                                     
  FROM node:20-alpine AS builder                                                                                                    
                                                                                                                                    
  WORKDIR /app                                                                                                                      
                                                                                                                                    
  # Install OpenSSL                                                                                                                 
  RUN apk add --no-cache openssl                                                                                                    
                                                                                                                                    
  # Copy package files                                                                                                              
  COPY package*.json ./                                                                                                             
  COPY prisma ./prisma/                                                                                                             
                                                                                                                                    
  # Install dependencies                                                                                                            
  RUN npm install                                                                                                                   
                                                                                                                                    
  # Copy source code                                                                                                                
  COPY . .                                                                                                                          
                                                                                                                                    
  # Generate Prisma client                                                                                                          
  RUN npx prisma generate                                                                                                           
                                                                                                                                    
  # Build TypeScript                                                                                                                
  RUN npm run build                                                                                                                 
                                                                                                                                    
  # Production stage                                                                                                                
  FROM node:20-alpine AS production                                                                                                 
                                                                                                                                    
  WORKDIR /app                                                                                                                      
                                                                                                                                    
  # Install dumb-init and OpenSSL                                                                                                   
  RUN apk add --no-cache dumb-init openssl                                                                                          
                                                                                                                                    
  # Copy package files                                                                                                              
  COPY package*.json ./                                                                                                             
  COPY prisma ./prisma/                                                                                                             
                                                                                                                                    
  # Install production dependencies only                                                                                            
  RUN npm install --only=production                                                                                                 
                                                                                                                                    
  # Generate Prisma client                                                                                                          
  RUN npx prisma generate                                                                                                           
                                                                                                                                    
  # Copy built files from builder                                                                                                   
  COPY --from=builder /app/dist ./dist                                                                                              
                                                                                                                                    
  # Create non-root user                                                                                                            
  RUN addgroup -g 1001 -S nodejs && \                                                                                               
      adduser -S nodejs -u 1001                                                                                                     
                                                                                                                                    
  # Create logs directory and set permissions                                                                                       
  RUN mkdir -p logs && chown -R nodejs:nodejs /app                                                                                  
                                                                                                                                    
  # Switch to non-root user                                                                                                         
  USER nodejs                                                                                                                       
                                                                                                                                    
  # Expose port                                                                                                                     
  EXPOSE 4000                                                                                                                       
                                                                                                                                    
  # Health check                                                                                                                    
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \                                                           
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1                                                 
                                                                                                                                    
  # Start the application                                                                                                           
  ENTRYPOINT ["dumb-init", "--"]                                                                                                    
  CMD ["node", "dist/index.js"]
