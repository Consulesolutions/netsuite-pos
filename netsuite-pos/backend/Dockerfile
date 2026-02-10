# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
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

# Install dumb-init for proper signal handling and openssl for Prisma
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

# Create non-root user and logs directory
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Railway sets PORT dynamically - don't hardcode
ENV PORT=4000

# Start script that syncs DB and starts server with debugging
CMD ["sh", "-c", "echo '=== Starting deployment ===' && npx prisma db push --accept-data-loss && echo '=== Prisma done, starting Node ===' && exec node dist/index.js"]
