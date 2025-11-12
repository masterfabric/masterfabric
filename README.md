# MasterFabric - Multi-Tenant BaaS Platform

A self-hosted, scalable Backend-as-a-Service (BaaS) platform built with NestJS microservices, providing Authentication, dynamic GraphQL APIs, and Real-time functionality for multi-tenant applications.

## 🏗️ Architecture

MasterFabric consists of five main services:

- **api-gateway**: True API Gateway with rate limiting, caching, request logging, and Apollo Federation
- **core-service**: Platform authentication, GraphQL API (user/org/project management), health monitoring
- **provisioning-service**: Async tenant provisioning with Cloudflare DNS integration
- **tenant-runtime**: Dynamic GraphQL API with request-scoped tenant isolation
- **dashboard**: Next.js 15 admin interface with shadcn/ui, real-time health monitoring, and integrated authentication

## 🛠️ Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Cache/Queue**: Redis 7
- **API Protocol**: GraphQL (100% - platform + tenant data)
- **Frontend**: Next.js 15 + shadcn/ui
- **Infrastructure**: Docker Compose v2 (with v1 compatibility)
- **Secrets Management**: HashiCorp Vault (optional)
- **Health Monitoring**: GraphQL-based health check system with real-time status updates
- **CI/CD**: Azure DevOps Pipelines with Node.js 20

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (LTS)
- Docker & Docker Compose (v2 recommended)
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

# Create environment file
cat > .env.local << 'EOF'
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
NEXT_PUBLIC_CORE_SERVICE_URL=http://localhost:3005/graphql
NEXT_PUBLIC_TENANT_RUNTIME_URL=http://localhost:3004/graphql

# Cloudflare (Optional - for DNS management)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=

# Vault Configuration (Optional - for secrets management)
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=masterfabric-root-token
EOF
```

4. **Start Services**:
```bash
# Local development (recommended)
./scripts/setup-local.sh

# Or manually with Docker Compose
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up

# For production
./scripts/deploy.sh production
```

### Service URLs

After starting the services, you can access:

- **Dashboard**: http://localhost:3000
- **Dashboard Login**: http://localhost:3000/dashboard/login
- **Dashboard Register**: http://localhost:3000/dashboard/register
- **Diagnostics Page**: http://localhost:3000/diagnostics
- **API Gateway**: http://localhost:3002
- **GraphQL Playground**: http://localhost:3002/graphql
- **Core Service**: http://localhost:3005
- **Provisioning Service**: http://localhost:3003
- **Tenant Runtime**: http://localhost:3004
- **Prisma Studio**: http://localhost:5555

## 📁 Project Structure

```
/masterfabric/
├── services/
│   ├── api-gateway/          # True API Gateway with rate limiting, caching, logging
│   ├── core-service/         # Platform authentication and business logic
│   ├── provisioning-service/ # Infrastructure manager
│   ├── tenant-runtime/       # GraphQL data engine
│   └── dashboard/            # Admin UI
├── scripts/                  # Automation scripts
│   ├── setup-local.sh        # Local development setup
│   ├── deploy.sh             # Production deployment
│   ├── vault-init.sh         # Vault initialization
│   └── migrate-secrets-to-vault.sh # Secrets migration
├── azure-pipelines/          # Azure DevOps pipelines
├── docker-compose.yml           # Base Docker configuration
├── docker-compose.local.yml     # Local development override
├── docker-compose.selfhosted.yml # Self-hosted production override
├── docker-compose.vault.yml     # Vault integration (optional)
└── package.json
```

## 🔑 Key Features

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

## 📡 API Documentation

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

## 🧪 Development

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

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres123@postgres_core:5432/masterfabric` |
| `REDIS_HOST` | Redis server hostname | `redis_cache` |
| `REDIS_PORT` | Redis server port | `6379` |
| `JWT_SECRET` | Secret key for JWT signing | **Change in production!** |
| `JWT_EXPIRES_IN` | JWT token expiration time | `7d` |
| `RATE_LIMIT_TTL` | Rate limiting time window (ms) | `60000` |
| `RATE_LIMIT_MAX` | Maximum requests per window | `100` |
| `CACHE_TTL` | Cache time-to-live (seconds) | `300` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (optional) | - |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone ID (optional) | - |

## 🏥 Health Monitoring

MasterFabric includes a comprehensive health check system with real-time monitoring:

- 🟢 **Real-time Status Indicator**: Green/red dot in dashboard top-right corner
- 📊 **Detailed Status View**: Click indicator to see all service statuses
- ⚡ **Auto-polling**: Checks services every 30 seconds
- 🔔 **Automatic Alerts**: Dialog appears when services go down
- 📈 **Response Time Tracking**: Monitor service performance
- 🔍 **Diagnostics Page**: Built-in diagnostics tool at `/diagnostics` for troubleshooting
- 📍 **Footer Status**: Real-time service health displayed in page footer
- 🔓 **Public Endpoints**: Health, login, and register endpoints accessible without API keys

### Health Check Endpoints
- API Gateway: `http://localhost:3002/health`
- Core Service: `http://localhost:3005/health`
- Provisioning Service: `http://localhost:3003/health`
- Tenant Runtime: `http://localhost:3004/health`

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

## 🤝 Contributing

Contributions are welcome! Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before submitting PRs.

### Commit Guidelines

When committing changes, please use the following commit types:

- `feat` – a new feature is introduced
- `fix` – a bug fix has occurred
- `docs` – updates to documentation
- `style` – code formatting changes
- `refactor` – code refactoring
- `test` – adding or updating tests
- `chore` – maintenance tasks
- `perf` – performance improvements
- `ci` – continuous integration changes
- `build` – build system changes

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) with additional terms specific to MasterFabric.

**Copyright (C) 2025 MASTERFABRIC Information Technologies Inc. & Gurkan Fikret Gunak**

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
