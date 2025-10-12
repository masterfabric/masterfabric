# Local Development Setup

This guide will help you set up MasterFabric for local development using Docker Compose.

## Prerequisites

- Docker Desktop (latest version)
- Docker Compose v2.0+
- Git
- Node.js 18+ (for local development without Docker)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/masterfabric/masterfabric.git
cd masterfabric
```

### 2. Environment Setup

Copy the environment file and configure your settings:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres123@postgres_core:5432/masterfabric
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=masterfabric

# Redis Configuration
REDIS_HOST=redis_cache
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Service URLs
CORE_SERVICE_URL=http://core-service:3005/graphql
PROVISIONING_SERVICE_URL=http://provisioning-service:3003/graphql
TENANT_RUNTIME_URL=http://tenant-runtime:3004/graphql

# API Gateway Configuration
API_GATEWAY_PORT=3002
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
CACHE_TTL=300

# Dashboard Configuration
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3002/graphql
NEXT_PUBLIC_TENANT_RUNTIME_URL=http://localhost:3004/graphql

# Cloudflare (Optional)
CLOUDFLARE_API_TOKEN=your-cloudflare-token
CLOUDFLARE_ZONE_ID=your-zone-id
```

### 3. Start Development Environment

#### Option A: Full Docker Development (Recommended)

```bash
# Start all services with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or run in background
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

#### Option B: Hybrid Development (Docker + Local)

```bash
# Start infrastructure services only
docker-compose up postgres_core redis_cache

# Start services locally (in separate terminals)
cd services/core-service && npm run start:dev
cd services/api-gateway && npm run start:dev
cd services/provisioning-service && npm run start:dev
cd services/tenant-runtime && npm run start:dev
cd services/dashboard && npm run dev
```

### 4. Verify Installation

Check that all services are running:

```bash
# Health checks
curl http://localhost:3002/health  # API Gateway
curl http://localhost:3005/health  # Core Service
curl http://localhost:3003/health  # Provisioning Service
curl http://localhost:3004/health  # Tenant Runtime
curl http://localhost:3000         # Dashboard

# GraphQL endpoints
curl -X POST http://localhost:3002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

## Development Workflow

### Code Changes

With the development setup, code changes are automatically reflected:

- **NestJS services**: Hot reload enabled, changes trigger automatic restart
- **Next.js dashboard**: Fast refresh enabled, changes appear instantly
- **Database changes**: Run migrations manually or restart services

### Database Management

#### Prisma Studio

Access the database GUI:

```bash
# If using Docker
docker-compose exec core-service npx prisma studio

# If running locally
cd services/core-service && npx prisma studio
```

Visit: http://localhost:5555

#### Database Migrations

```bash
# Create a new migration
cd services/core-service
npx prisma migrate dev --name your-migration-name

# Reset database (development only)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy
```

### Logs and Debugging

#### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f core-service
docker-compose logs -f api-gateway
docker-compose logs -f dashboard
```

#### Debug Mode

Enable debug logging by setting environment variables:

```env
DEBUG=*
LOG_LEVEL=debug
```

### Testing

#### Run Tests

```bash
# All services
npm run test

# Specific service
cd services/core-service && npm run test
cd services/api-gateway && npm run test

# E2E tests
npm run test:e2e
```

#### Test Database

Tests use a separate test database. Ensure your `.env.local` includes:

```env
TEST_DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/masterfabric_test
```

## Troubleshooting

### Common Issues

#### Port Conflicts

If you get port conflicts:

```bash
# Kill processes on ports 3000-3005
lsof -ti:3000,3001,3002,3003,3004,3005 | xargs kill -9

# Or use the provided script
./scripts/kill-ports.sh
```

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres_core

# Check database logs
docker-compose logs postgres_core

# Reset database
docker-compose down -v
docker-compose up postgres_core
```

#### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps redis_cache

# Test Redis connection
docker-compose exec redis_cache redis-cli ping
```

#### Service Dependencies

Services start in dependency order, but if you encounter issues:

```bash
# Start infrastructure first
docker-compose up postgres_core redis_cache

# Wait for them to be ready, then start services
docker-compose up core-service api-gateway provisioning-service tenant-runtime dashboard
```

### Performance Optimization

#### Resource Limits

For better performance, adjust Docker resource limits in `docker-compose.dev.yml`:

```yaml
services:
  core-service:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
```

#### Database Optimization

For development, you can use a lighter database setup:

```yaml
services:
  postgres_core:
    image: postgres:15-alpine
    command: postgres -c shared_preload_libraries=pg_stat_statements
```

## Development Tools

### Useful Scripts

```bash
# Start all services
./start-masterfabric.sh

# Restart all services
./reboot-masterfabric.sh

# Kill all services
./scripts/kill-ports.sh

# Setup development environment
./scripts/setup-dev.sh
```

### IDE Configuration

#### VS Code

Recommended extensions:

- Prisma
- Docker
- GraphQL
- TypeScript Importer
- REST Client

#### IntelliJ/WebStorm

- Docker plugin
- GraphQL plugin
- Database tools

### API Testing

#### GraphQL Playground

Access GraphQL Playground for each service:

- API Gateway: http://localhost:3002/graphql
- Core Service: http://localhost:3005/graphql
- Provisioning Service: http://localhost:3003/graphql
- Tenant Runtime: http://localhost:3004/graphql

#### REST API Testing

Use tools like Postman, Insomnia, or VS Code REST Client extension.

## Next Steps

- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)
- [Vault Setup Guide](VAULT_SETUP.md)
- [CI/CD Setup Guide](CI_CD_SETUP.md)
