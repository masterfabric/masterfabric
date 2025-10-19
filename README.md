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
- **Cache/Queue**: Redis 7
- **API Protocol**: GraphQL (100% - platform + tenant data)
- **Frontend**: Next.js 15 + shadcn/ui
- **Infrastructure**: Docker Compose v2 (with v1 compatibility)
- **Secrets Management**: HashiCorp Vault (optional)
- **Health Monitoring**: GraphQL-based health check system with real-time status updates
- **CI/CD**: Azure DevOps Pipelines with Node.js 20

## Quick Start

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

# Create environment file (copy the configuration from Environment Variables section below)
cat > .env.local << 'EOF'
# =============================================================================
# MasterFabric Environment Configuration
# =============================================================================

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
# Modern Docker Compose (recommended)
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.dev.yml up

# Or use the provided startup script
./start-masterfabric.sh

# For production
./scripts/deploy.sh production
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
# Development with hot reload (modern Docker Compose)
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.dev.yml up

# Production deployment
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up

# With Vault for secrets management
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.vault.yml up

# Using provided scripts (recommended)
./start-masterfabric.sh          # Start all services
./reboot-masterfabric.sh         # Reboot with cleanup
./scripts/deploy.sh production   # Production deployment
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
├── scripts/                  # Modern automation scripts
│   ├── setup-local.sh        # Local development setup
│   ├── deploy.sh             # Production deployment
│   ├── vault-init.sh         # Vault initialization
│   └── migrate-secrets-to-vault.sh # Secrets migration
├── .github/workflows/        # GitHub Actions CI/CD
├── azure-pipelines/          # Azure DevOps pipelines
├── docker-compose.yml        # Base Docker configuration
├── docker-compose.dev.yml    # Development configuration
├── docker-compose.prod.yml   # Production configuration
├── docker-compose.vault.yml  # Vault integration
├── .env.local               # Environment variables
└── package.json
```

## Modern Scripts & Automation

MasterFabric includes professional, modern automation scripts with beautiful UI and comprehensive functionality:

### Main Scripts

#### 🚀 **start-masterfabric.sh** - Platform Startup
```bash
./start-masterfabric.sh          # Start all services
./start-masterfabric.sh --help   # Show help
./start-masterfabric.sh --stop   # Stop all services
./start-masterfabric.sh --status # Check service status
```

**Features:**
- ✅ **Modern Docker Compose Support**: Auto-detects Docker Compose v1/v2
- ✅ **Progress Bars**: Visual progress indicators
- ✅ **Health Checks**: Automatic service validation
- ✅ **Professional UI**: Clean, colored output with MASTERFABRIC branding
- ✅ **Prerequisites Check**: Validates all required tools

#### 🔄 **reboot-masterfabric.sh** - Platform Reboot
```bash
./reboot-masterfabric.sh         # Full reboot with cleanup
./reboot-masterfabric.sh --quick # Quick reboot (skip cache clearing)
./reboot-masterfabric.sh --help  # Show help
```

**Features:**
- ✅ **Complete Cleanup**: Kills processes, clears cache, removes unused Docker resources
- ✅ **Health Monitoring**: Comprehensive health checks with retry logic
- ✅ **Two Modes**: Full reboot or quick restart
- ✅ **Service Validation**: Ensures all services are healthy before completion

### Development Scripts

#### 🛠️ **scripts/setup-local.sh** - Local Development Setup
```bash
./scripts/setup-local.sh
```

**Features:**
- ✅ **Automated Setup**: Creates .env.local, installs dependencies, sets up database
- ✅ **Docker Integration**: Builds images and starts services
- ✅ **Health Validation**: Verifies all services are running
- ✅ **Modern Practices**: Uses latest Docker Compose commands

#### 🚀 **scripts/deploy.sh** - Production Deployment
```bash
./scripts/deploy.sh production    # Production deployment
./scripts/deploy.sh development   # Development deployment
./scripts/deploy.sh rollback      # Rollback to previous version
./scripts/deploy.sh health        # Run health checks
./scripts/deploy.sh backup        # Create backup only
```

**Features:**
- ✅ **Rolling Updates**: Zero-downtime deployments
- ✅ **Automated Backups**: Database and volume backups
- ✅ **Health Validation**: Comprehensive service testing
- ✅ **Rollback Support**: Quick rollback to previous version

### Security Scripts

#### 🔐 **scripts/vault-init.sh** - Vault Initialization
```bash
./scripts/vault-init.sh
```

**Features:**
- ✅ **Secure Setup**: Initializes HashiCorp Vault with proper policies
- ✅ **Service Tokens**: Generates individual tokens for each service
- ✅ **Progress Tracking**: Visual progress indicators
- ✅ **Professional Output**: Clean completion summary

#### 🔄 **scripts/migrate-secrets-to-vault.sh** - Secrets Migration
```bash
./scripts/migrate-secrets-to-vault.sh
```

**Features:**
- ✅ **Automated Migration**: Moves .env.local secrets to Vault
- ✅ **Validation**: Checks Vault connectivity and .env.local existence
- ✅ **Progress Tracking**: Visual progress for each service
- ✅ **Error Handling**: Comprehensive error checking and reporting

### Script Features

All scripts include:
- 🎨 **Professional UI**: Clean MASTERFABRIC branding with colors
- 📊 **Progress Bars**: Visual feedback for long operations
- 🔧 **Modern Docker Support**: Works with Docker Compose v1 and v2
- ⚡ **Error Handling**: Comprehensive validation and error messages
- 📝 **Help System**: Built-in help with usage examples
- 🛡️ **Safety Checks**: Prerequisites validation and safety measures

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

Create a `.env.local` file in the project root with the following configuration:

```bash
# =============================================================================
# MasterFabric Environment Configuration
# =============================================================================

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

# Cloudflare (Optional - for DNS management)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=

# Vault Configuration (Optional - for secrets management)
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=masterfabric-root-token
```

### Quick Setup Commands

```bash
# Copy the example above to create your .env.local file
cat > .env.local << 'EOF'
# =============================================================================
# MasterFabric Environment Configuration
# =============================================================================

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

# Cloudflare (Optional - for DNS management)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=

# Vault Configuration (Optional - for secrets management)
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=masterfabric-root-token
EOF
```

### Configuration Options

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

