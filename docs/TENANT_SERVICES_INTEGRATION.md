# Tenant Services Integration Guide

## 📋 Overview

This document explains how the **Tenant Runtime** and **Provisioning Service** integrate with the **API Gateway** using Apollo Federation.

## 🏗️ Architecture

```
┌─────────────────┐
│   API Gateway   │
│   (Port 3001)   │
└────────┬────────┘
         │ GraphQL Federation
         │
    ┌────┴─────────────────────┐
    │                          │
    ▼                          ▼
┌──────────────┐      ┌────────────────┐      ┌──────────────┐
│ Core Service │      │ Tenant Runtime │      │ Provisioning │
│ (Port 3005)  │      │  (Port 3004)   │      │ (Port 3003)  │
└──────────────┘      └────────────────┘      └──────────────┘
```

## 🔐 Authentication Flow

### Service-to-Service Authentication
All microservices use **API Key authentication** to verify requests from the API Gateway:

```
API Gateway → [X-API-Key Header] → Microservice
```

### User Authentication
User JWT tokens are forwarded through the GraphQL context:

```
Client → [Authorization: Bearer JWT] → API Gateway → [Authorization Header] → Microservice
```

## 📦 What Was Implemented

### Tenant Runtime Service

#### New Files Created:
1. **`src/core/guards/api-key.guard.ts`**
   - Validates API keys from API Gateway
   - Checks `X-API-Key` header
   - Allows public routes with `@Public()` decorator

2. **`src/core/decorators/public.decorator.ts`**
   - Marks routes as public (bypass API key check)
   - Used for health checks

3. **`src/core/interceptors/logging.interceptor.ts`**
   - Logs all GraphQL operations
   - Tracks response times
   - Includes tenant ID in logs

#### Updated Files:
- **`src/app.module.ts`**
  - Added `ApiKeyGuard` as global guard
  - Added `LoggingInterceptor` for request logging
  - Improved GraphQL Federation configuration
  - Proper guard order: ApiKey → JWT → TenantIsolation

- **`src/main.ts`**
  - Added Helmet for security
  - Enhanced CORS configuration
  - Added proper headers (`X-API-Key`, `X-Tenant-ID`)
  - Better error handling and logging

- **`package.json`**
  - Added `helmet` dependency

### Provisioning Service

#### New Files Created:
1. **`src/core/guards/api-key.guard.ts`**
2. **`src/core/decorators/public.decorator.ts`**
3. **`src/core/interceptors/logging.interceptor.ts`**

#### Updated Files:
- **`src/app.module.ts`**
  - Added `ApiKeyGuard` as global guard
  - Added `LoggingInterceptor`
  
- **`src/main.ts`**
  - Added Helmet for security
  - Enhanced CORS and headers
  - Better Redis microservice logging

- **`src/graphql/graphql.module.ts`**
  - Enhanced GraphQL Federation v2 configuration
  - Added proper context handling
  - Improved error formatting

- **`package.json`**
  - Added `helmet` and `@nestjs/platform-express` dependencies

## 🔧 Environment Variables

### Required for Tenant Runtime (.env.local):
```bash
# Service Configuration
PORT=3004
NODE_ENV=development

# API Key for API Gateway authentication
SERVICE_API_KEY=your-tenant-runtime-api-key
TENANT_RUNTIME_SERVICE_API_KEY=your-tenant-runtime-api-key

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tenant_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3002
```

### Required for Provisioning Service (.env.local):
```bash
# Service Configuration
PORT=3003
NODE_ENV=development

# API Key for API Gateway authentication
SERVICE_API_KEY=your-provisioning-api-key
PROVISIONING_SERVICE_API_KEY=your-provisioning-api-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/provisioning_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3002

# Cloudflare (for DNS management)
CLOUDFLARE_API_TOKEN=your-cloudflare-token
CLOUDFLARE_ZONE_ID=your-zone-id
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
# Tenant Runtime
cd services/tenant-runtime
npm install

# Provisioning Service
cd services/provisioning-service
npm install
```

### 2. Configure Environment Variables

Create `.env.local` files in both service directories with the variables above.

**IMPORTANT:** API keys must match between API Gateway and each service:
- `TENANT_RUNTIME_SERVICE_API_KEY` in API Gateway = `SERVICE_API_KEY` in Tenant Runtime
- `PROVISIONING_SERVICE_API_KEY` in API Gateway = `SERVICE_API_KEY` in Provisioning Service

### 3. Generate API Keys

```bash
# Generate secure API keys (use in production)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start Services

```bash
# Start in order:

# 1. Tenant Runtime
cd services/tenant-runtime
npm run start:dev

# 2. Provisioning Service
cd services/provisioning-service
npm run start:dev

# 3. API Gateway (will auto-detect services)
cd services/api-gateway
npm run start:dev
```

## 🧪 Testing the Integration

### 1. Check Service Health

```bash
# Tenant Runtime
curl http://localhost:3004/health

# Provisioning Service
curl http://localhost:3003/health

# API Gateway
curl http://localhost:3001/health
```

### 2. Test GraphQL Federation

```bash
# Query through API Gateway
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-gateway-key" \
  -d '{"query":"{ getProvisioningStatus { status message } }"}'
```

### 3. Check System Health Dashboard

```bash
curl http://localhost:3001/api/system/health
```

## 📊 API Gateway Configuration

The API Gateway automatically detects and registers services:

```typescript
// services/api-gateway/src/app.module.ts
const serviceConfig = {
  core: {
    name: 'core',
    url: 'http://localhost:3005/graphql',
  },
  provisioning: {
    name: 'provisioning',
    url: 'http://localhost:3003/graphql',
  },
  'tenant-runtime': {
    name: 'tenant-runtime',
    url: 'http://localhost:3004/graphql',
  },
};
```

## 🔒 Security Features

### 1. API Key Guard
- All routes require valid API key
- Public routes use `@Public()` decorator
- Keys validated against environment variables

### 2. Helmet Security
- Content Security Policy
- XSS Protection
- HSTS enabled
- Frame options

### 3. CORS Configuration
- Whitelisted origins only
- Credentials support
- Custom headers allowed

### 4. Request Logging
- All operations logged with timing
- Tenant ID tracking
- Error tracking

## 🐛 Troubleshooting

### Service Not Connecting to API Gateway

1. **Check API Keys Match**
   ```bash
   # In API Gateway .env
   TENANT_RUNTIME_SERVICE_API_KEY=xxx
   
   # In Tenant Runtime .env
   SERVICE_API_KEY=xxx  # Must match!
   ```

2. **Verify Service URLs**
   ```bash
   # Check if services are running on correct ports
   netstat -an | grep LISTEN | grep -E '3003|3004|3005'
   ```

3. **Check Service Health**
   ```bash
   curl http://localhost:3004/health
   curl http://localhost:3003/health
   ```

### GraphQL Federation Errors

1. **Schema Composition Issues**
   - Ensure all services use Apollo Federation v2
   - Check `@apollo/subgraph` version is ^2.x
   - Verify `autoSchemaFile.federation: 2` in GraphQL config

2. **Introspection Errors**
   - Check API keys are sent in introspection headers
   - Verify `introspection: true` in GraphQL config

### API Key Authentication Failures

```bash
# Test with correct API key
curl -H "X-API-Key: your-key" http://localhost:3004/graphql

# Should return 401 without key
curl http://localhost:3004/graphql
```

## 📝 Implementation Checklist

- [x] API Key Guard implementation
- [x] Public decorator for health checks
- [x] Logging interceptor
- [x] Enhanced main.ts with security
- [x] Helmet integration
- [x] Proper CORS configuration
- [x] GraphQL Federation v2 setup
- [x] Context forwarding (tenant ID, user JWT)
- [x] Error handling and formatting
- [x] Package dependencies updated
- [x] Environment variable documentation

## 🎯 Next Steps

1. **Test the Services**
   - Start all services
   - Verify API Gateway detects them
   - Test GraphQL queries

2. **Configure Production**
   - Use HashiCorp Vault for API keys
   - Set proper CORS origins
   - Enable production logging

3. **Add Monitoring**
   - Service health checks
   - Request tracking
   - Error alerting

## 📚 Related Documentation

- [API Gateway Configuration](./CONNECTION_MANAGEMENT.md)
- [GraphQL Schema](./GRAPHQL_SCHEMA.md)
- [Health Check System](./HEALTH_CHECK_SYSTEM.md)
- [Production Deployment](./deployment/PRODUCTION_DEPLOYMENT.md)

---

**License:** GNU AGPL-3.0  
**© 2025 MASTERFABRIC Information Technologies Inc.**  
**Author:** @gurkanfikretgunak

