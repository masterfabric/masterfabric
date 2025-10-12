# MasterFabric - Multi-Tenant BaaS Platform

A self-hosted, scalable Backend-as-a-Service (BaaS) platform built with NestJS microservices, providing Authentication, dynamic GraphQL APIs, and Real-time functionality for multi-tenant applications.

## Architecture

**🎯 Current Status: Phase 2 Complete - True API Gateway with Enterprise Features**


MasterFabric consists of five main services:

- **api-gateway**: True API Gateway with rate limiting, caching, request logging, and Apollo Federation
- **core-service**: Platform authentication, GraphQL API (user/org/project management), health monitoring
- **provisioning-service**: Async tenant provisioning with Cloudflare DNS integration
- **tenant-runtime**: Dynamic GraphQL API with request-scoped tenant isolation
- **dashboard**: Next.js admin interface with shadcn/ui components

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Cache/Queue**: Redis
- **API Protocol**: GraphQL (100% - platform + tenant data)
- **Frontend**: Next.js 14 + shadcn/ui
- **Infrastructure**: Docker Compose
- **Health Monitoring**: GraphQL-based health check system with real-time status updates

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd masterfabric
```

2. **Quick Setup (Recommended)**:
```bash
# Automated setup with Docker
./scripts/setup-local.sh
```

3. **Manual Setup**:
```bash
# Install dependencies
npm install

# Configure environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Start Services**:
```bash
# Development with hot reload
docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.dev.yml up

# Or use the provided script
./start-masterfabric.sh
```

### Service URLs

After starting the services, you can access:

- **Dashboard**: http://localhost:3000
- **API Gateway**: http://localhost:3002
- **GraphQL Playground**: http://localhost:3002/graphql
- **Core Service**: http://localhost:3005
- **Provisioning Service**: http://localhost:3003
- **Tenant Runtime**: http://localhost:3004
- **Prisma Studio**: http://localhost:5555

### Production Deployment

For production deployment, see the comprehensive guides:

- **[Local Development Guide](docs/deployment/LOCAL_DEVELOPMENT.md)** - Complete local setup
- **[Production Deployment Guide](docs/deployment/PRODUCTION_DEPLOYMENT.md)** - Production deployment
- **[Vault Setup Guide](docs/deployment/VAULT_SETUP.md)** - Secure secrets management
- **[CI/CD Setup Guide](docs/deployment/CI_CD_SETUP.md)** - Automated deployments

### Docker Commands

```bash
# Development with hot reload
docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.dev.yml up

# Production deployment
docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up

# With Vault for secrets management
docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.vault.yml up
```

## Project Structure

```
/masterfabric/
├── services/
│   ├── api-gateway/          # True API Gateway with rate limiting, caching, logging
│   ├── core-service/         # Platform authentication and business logic
│   ├── provisioning-service/ # Infrastructure manager
│   ├── tenant-runtime/       # GraphQL data engine
│   └── dashboard/            # Admin UI
├── docs/deployment/          # Comprehensive deployment guides
├── scripts/                  # Automation scripts
├── .github/workflows/        # GitHub Actions CI/CD
├── azure-pipelines/          # Azure DevOps pipelines
├── docker-compose.yml        # Base Docker configuration
├── docker-compose.dev.yml    # Development configuration
├── docker-compose.prod.yml   # Production configuration
├── docker-compose.vault.yml  # Vault integration
├── .env.local               # Environment variables
└── package.json
```

## Key Features

### Multi-Tenant Isolation
- Single database with organization_id filtering (RLS emulation)
- Request-scoped database connections
- Subdomain/JWT token verification

### Dynamic Schema Management
- User-defined table creation via API
- Automatic GraphQL schema generation
- Prisma-based migrations

### Cloudflare DNS Integration
- Automatic subdomain provisioning
- CNAME record management
- SSL/TLS via Cloudflare proxy

### Security
- JWT-based authentication
- Global guards for tenant isolation
- Password hashing with bcrypt
- Transaction-safe provisioning

### API Gateway Features
- **Rate Limiting**: Redis-based throttling (100 requests/minute)
- **Caching**: Redis-based response caching (5-minute TTL)
- **Request Logging**: Comprehensive request/response logging
- **Apollo Federation**: Unified GraphQL schema across all services
- **Health Monitoring**: Real-time service health checks

## API Documentation

### Platform API (core-service)

**Register Organization**
```bash
POST /auth/register
{
  "email": "admin@example.com",
  "password": "secure-password",
  "organizationName": "My Company",
  "slug": "my-company"
}
```

**Login (GraphQL)**
```graphql
mutation Login {
  login(
    email: "admin@example.com"
    password: "secure-password"
  ) {
    token
    user {
      id
      email
      role
    }
  }
}
```

**Check Organization Status (GraphQL)**
```graphql
query OrganizationStatus {
  organizationStatus(id: "org-id") {
    status
    message
  }
}
# Headers: { "Authorization": "Bearer <token>" }
```

### Tenant API (tenant-runtime)

**Register Tenant User**
```graphql
mutation {
  tenantRegister(email: "user@example.com", password: "password") {
    token
    user {
      id
      email
    }
  }
}
```

**Login Tenant User**
```graphql
mutation {
  tenantLogin(email: "user@example.com", password: "password") {
    token
  }
}
```

## Development

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
cd services/core-service
npx prisma migrate dev --name migration_name
```

### Viewing Database
```bash
cd services/core-service
npx prisma studio
```

## Configuration

### Environment Variables

See `.env.local` file for all configuration options:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT signing
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token
- `CLOUDFLARE_ZONE_ID`: Cloudflare zone ID

## Database Connection Management

MasterFabric provides a secure and user-friendly system for managing database connections:

### Features

- **Secure Password Management**: Passwords are masked and require verification to view
- **Connection Testing**: Real-time connection tests with response time measurement
- **Easy Updates**: Update connection settings through intuitive dialogs
- **Error Handling**: Detailed error messages and troubleshooting tips
- **Default Configuration**: Automatic setup with sensible defaults

### Usage

Navigate to **Dashboard → Settings → Database & Microservices** to:
1. View PostgreSQL and Redis connection settings
2. Test connections with the "Check Status" button
3. Update connection details with the "Update Connection" button
4. View passwords securely with the "Show" button

For detailed documentation, see [Connection Management Guide](./docs/CONNECTION_MANAGEMENT.md)

## Health Monitoring

MasterFabric includes a comprehensive health check system with real-time monitoring:

### Features
- 🟢 **Real-time Status Indicator**: Green/red dot in dashboard top-right corner
- 📊 **Detailed Status View**: Click indicator to see all service statuses
- ⚡ **Auto-polling**: Checks services every 30 seconds
- 🔔 **Automatic Alerts**: Dialog appears when services go down
- 📈 **Response Time Tracking**: Monitor service performance

### GraphQL Health Queries
```graphql
# Check all services
query {
  systemHealth {
    overall
    services {
      service
      status
      message
      responseTime
    }
  }
}

# Check specific service
query {
  serviceHealth(serviceName: "api-gateway") {
    service
    status
    message
    responseTime
  }
}
```

### Health Check Endpoints
- API Gateway: `http://localhost:3002/health`
- Core Service: `http://localhost:3005/health`
- Provisioning Service: `http://localhost:3003/health`
- Tenant Runtime: `http://localhost:3004/health`

For detailed documentation, see [Health Check System Guide](./docs/HEALTH_CHECK_SYSTEM.md)

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **Setup & Installation**: [Setup Guide](./docs/SETUP.md)
- **Architecture**: [Architecture Analysis](./docs/ARCHITECTURE_ANALYSIS.md)
- **Testing**: [Testing Guide](./docs/TESTING_GUIDE.md)
- **System Management**: [System Settings Guide](./docs/SYSTEM_SETTINGS_GUIDE.md)
- **API Reference**: [GraphQL Schema](./docs/GRAPHQL_SCHEMA.md)

See [Documentation Index](./docs/README.md) for the complete list.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) with additional terms specific to MasterFabric.

**Copyright (C) 2024 MASTERFABRIC Bilişim Teknolojileri A.Ş. & Gürkan Fikret Günak**

### Key Points:
- **Open Source**: Free to use, modify, and distribute under AGPL-3.0
- **Commercial Use**: Allowed with proper attribution
- **Forking**: Requires contact with MASTERFABRIC within 10 days
- **Attribution**: Must include license information in applications and documentation

### Contact:
- **License Email**: license@masterfabric.co
- **Company Website**: https://masterfabric.co
- **Author**: @gurkanfikretgunak

See [LICENSE](LICENSE) file for complete terms and conditions.

### Important Notice for Forkers:
If you fork this repository, you must contact MASTERFABRIC Information Technologies Inc. via email (license@masterfabric.co) within 10 days of forking. Failure to do so may result in termination of license rights.

