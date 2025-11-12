# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install wget for healthchecks and OpenSSL for Prisma
RUN apk add --no-cache wget openssl openssl-dev

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS dev
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client with OpenSSL 3.x
ENV PRISMA_OPENSSL_VERSION=openssl-3.0.x
RUN npx prisma generate

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

# Start the application
CMD ["npm", "run", "start:dev"]

# Builder stage for production
FROM dev AS builder
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application from builder stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

# Start the application with migration
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
