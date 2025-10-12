# MasterFabric Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### 1. Environment Setup

Copy the environment file and configure your settings:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/masterfabric_core
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=masterfabric_core

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Cloudflare Configuration (Optional - for DNS management)
CLOUDFLARE_API_TOKEN=your-cloudflare-token
CLOUDFLARE_ZONE_ID=your-zone-id

# API URLs
API_GATEWAY_URL=http://localhost:3000
TENANT_RUNTIME_URL=http://localhost:3001
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3000
NEXT_PUBLIC_TENANT_RUNTIME_URL=http://localhost:3001/graphql
```

### 2. Start Infrastructure Services

Start PostgreSQL and Redis:
```bash
docker-compose up -d postgres_core redis_cache
```

### 3. Database Setup

Run the initial database migration:
```bash
cd services/api-gateway
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Install Dependencies

Install dependencies for all services:
```bash
# Root level
npm install

# API Gateway
cd services/api-gateway
npm install

# Provisioning Service
cd ../provisioning-service
npm install

# Tenant Runtime
cd ../tenant-runtime
npm install

# Dashboard
cd ../dashboard
npm install
```

### 5. Start All Services

#### Option A: Docker Compose (Recommended)
```bash
# From root directory
docker-compose up --build
```

#### Option B: Manual Development
```bash
# Terminal 1 - API Gateway
cd services/api-gateway
npm run start:dev

# Terminal 2 - Provisioning Service
cd services/provisioning-service
npm run start:dev

# Terminal 3 - Tenant Runtime
cd services/tenant-runtime
npm run start:dev

# Terminal 4 - Dashboard
cd services/dashboard
npm run dev
```

### 6. Access the Services

- **Dashboard**: http://localhost:3002
- **API Gateway**: http://localhost:3000
- **Tenant Runtime GraphQL**: http://localhost:3001/graphql

## Testing the Complete Flow

### 1. Register an Organization
1. Go to http://localhost:3002/register
2. Fill in the registration form:
   - Email: admin@example.com
   - Password: secure-password
   - Organization Name: My Company
   - Organization Slug: my-company
3. Submit the form and wait for provisioning to complete

### 2. Access Your Organization
1. After registration, you'll be redirected to the dashboard
2. Your organization will be available at: `my-company.masterfabric.co`
3. GraphQL API endpoint: `my-company.masterfabric.co/graphql`

### 3. Test Tenant Authentication
Use the GraphQL playground at your tenant endpoint:

```graphql
# Register a tenant user
mutation {
  tenantRegister(input: {
    email: "user@example.com"
    password: "password123"
  }) {
    token
    user {
      id
      email
      organizationId
    }
  }
}

# Login a tenant user
mutation {
  tenantLogin(input: {
    email: "user@example.com"
    password: "password123"
  }) {
    token
    user {
      id
      email
      organizationId
    }
  }
}
```

### 4. Test Dynamic Data Operations
```graphql
# Create a product (requires authentication)
mutation {
  createProduct(input: {
    name: "Widget"
    price: 29.99
  }) {
    id
    name
    price
    organizationId
  }
}

# Query products
query {
  products {
    id
    name
    price
    organizationId
  }
}
```

### 5. Test Dynamic Schema Creation
```graphql
# Create a new table
mutation {
  createTable(input: {
    tableName: "orders"
    fields: [
      { name: "customerName", type: "String" }
      { name: "total", type: "Float" }
      { name: "isPaid", type: "Boolean" }
    ]
  })
}
```

## Architecture Overview

### Services
- **api-gateway** (Port 3000): Platform authentication, subdomain routing
- **provisioning-service**: Async tenant provisioning, Cloudflare DNS
- **tenant-runtime** (Port 3001): GraphQL API with tenant isolation
- **dashboard** (Port 3002): Next.js admin interface

### Database
- **Core DB**: PostgreSQL with Organizations, Users, Projects tables
- **Tenant Data**: Same PostgreSQL with organization_id filtering (RLS emulation)

### Key Features
- Multi-tenant isolation via organization_id
- Dynamic GraphQL schema generation
- Request-scoped database connections
- JWT-based authentication
- Cloudflare DNS integration
- Transaction-safe provisioning

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running: `docker-compose ps`
   - Check DATABASE_URL in .env.local file
   - Run migrations: `npx prisma migrate dev`

2. **Redis Connection Errors**
   - Ensure Redis is running: `docker-compose ps`
   - Check REDIS_URL in .env.local file

3. **JWT Errors**
   - Ensure JWT_SECRET is set in .env.local
   - Check token expiration settings

4. **Cloudflare DNS Errors**
   - Cloudflare credentials are optional for development
   - Check CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID

### Logs
View service logs:
```bash
# Docker Compose
docker-compose logs -f [service-name]

# Individual services
cd services/[service-name]
npm run start:dev
```

## Development

### Adding New Features
1. Create feature branch
2. Implement changes in relevant service
3. Update tests
4. Update documentation
5. Submit pull request

### Database Changes
1. Update Prisma schema in `services/api-gateway/prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev --name [description]`
3. Update related services as needed

### API Changes
1. Update DTOs and interfaces
2. Update GraphQL schema (tenant-runtime)
3. Update frontend API client
4. Update documentation

## Production Deployment

### Environment Variables
- Set strong JWT_SECRET
- Configure production database URLs
- Set up Cloudflare credentials
- Configure proper CORS origins

### Security
- Enable HTTPS
- Set up proper firewall rules
- Use environment-specific secrets
- Enable database SSL

### Monitoring
- Set up logging aggregation
- Monitor service health
- Set up alerts for failures
- Monitor database performance
