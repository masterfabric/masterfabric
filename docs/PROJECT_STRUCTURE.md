# MasterFabric Project Structure

## 📁 Overview

MasterFabric is a multi-tenant Backend-as-a-Service (BaaS) platform built with a microservices architecture. The project is organized into five main services with comprehensive documentation and deployment configurations.

## 🏗️ Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MasterFabric Platform                    │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard (Next.js)     │  API Gateway (NestJS)               │
│  Port: 3000              │  Port: 3002                         │
│  - Admin Interface       │  - Rate Limiting                    │
│  - shadcn/ui Components  │  - Request Caching                  │
│  - GraphQL Client        │  - Request Logging                  │
│                          │  - Apollo Federation                │
└─────────────┬───────────┴─────────────┬─────────────────────────┘
              │                         │
              │                         ├─── Core Service (NestJS)
              │                         │    Port: 3005
              │                         │    - Authentication
              │                         │    - User Management
              │                         │    - Organization Management
              │                         │    - Project Management
              │                         │
              │                         ├─── Provisioning Service (NestJS)
              │                         │    Port: 3003
              │                         │    - Tenant Provisioning
              │                         │    - Cloudflare DNS
              │                         │    - Redis Microservice
              │                         │
              │                         └─── Tenant Runtime (NestJS)
              │                              Port: 3004
              │                              - Dynamic GraphQL API
              │                              - Multi-tenant DB Context
              │                              - Request-scoped Isolation
              │
              └─── Infrastructure
                   - PostgreSQL 15
                   - Redis
                   - Docker Compose
                   - Vault (Optional)
```

## 📂 Directory Structure

```
/masterfabric/
├── 📁 services/                    # Core microservices
│   ├── 📁 api-gateway/            # True API Gateway
│   │   ├── 📁 src/
│   │   │   ├── 📁 modules/
│   │   │   │   ├── 📁 cache/      # Redis caching module
│   │   │   │   ├── 📁 health/     # Health check endpoints
│   │   │   │   └── 📁 rate-limit/ # Rate limiting module
│   │   │   ├── 📁 core/
│   │   │   │   └── 📁 routing/    # Request routing logic
│   │   │   ├── 📁 interceptors/   # Request/response logging
│   │   │   └── 📁 config/         # Vault configuration
│   │   ├── 📁 dist/               # Compiled JavaScript
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── 📁 core-service/           # Platform business logic
│   │   ├── 📁 src/
│   │   │   ├── 📁 modules/
│   │   │   │   ├── 📁 auth/       # Authentication (16 files)
│   │   │   │   ├── 📁 health/     # Health monitoring (5 files)
│   │   │   │   ├── 📁 organizations/ # Organization management (8 files)
│   │   │   │   ├── 📁 project-schemas/ # Schema management (6 files)
│   │   │   │   ├── 📁 projects/   # Project management (7 files)
│   │   │   │   ├── 📁 tenant-users/ # Tenant user management (7 files)
│   │   │   │   └── 📁 users/      # User management (6 files)
│   │   │   ├── 📁 prisma/         # Database layer
│   │   │   └── 📁 config/         # Vault configuration
│   │   ├── 📁 prisma/
│   │   │   ├── 📁 migrations/     # Database migrations
│   │   │   └── schema.prisma      # Database schema
│   │   ├── 📁 dist/               # Compiled JavaScript
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── 📁 provisioning-service/   # Infrastructure management
│   │   ├── 📁 src/
│   │   │   ├── 📁 graphql/        # GraphQL schema (2 files)
│   │   │   ├── 📁 modules/        # Service modules (5 files)
│   │   │   ├── 📁 prisma/         # Database layer
│   │   │   └── 📁 config/         # Configuration
│   │   ├── 📁 dist/               # Compiled JavaScript
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── 📁 tenant-runtime/         # Dynamic GraphQL engine
│   │   ├── 📁 src/
│   │   │   ├── 📁 core/           # Core functionality (5 files)
│   │   │   ├── 📁 modules/        # Runtime modules (18 files)
│   │   │   ├── 📁 prisma/         # Database layer
│   │   │   └── 📁 config/         # Configuration
│   │   ├── 📁 dist/               # Compiled JavaScript
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── 📁 dashboard/              # Next.js admin interface
│       ├── 📁 src/
│       │   ├── 📁 app/            # Next.js 14 app router (12 files)
│       │   ├── 📁 components/     # React components (10 files)
│       │   └── 📁 lib/            # Utilities (3 files)
│       ├── 📁 node_modules/       # Dependencies
│       ├── components.json        # shadcn/ui configuration
│       ├── next.config.js         # Next.js configuration
│       ├── tailwind.config.ts     # Tailwind CSS configuration
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── 📁 docs/                       # Comprehensive documentation
│   ├── 📁 deployment/             # Deployment guides
│   │   ├── CI_CD_SETUP.md         # CI/CD pipeline setup
│   │   ├── LOCAL_DEVELOPMENT.md   # Local development guide
│   │   ├── PRODUCTION_DEPLOYMENT.md # Production deployment
│   │   └── VAULT_SETUP.md         # Vault secrets management
│   ├── ARCHITECTURE_ANALYSIS.md   # Architecture analysis
│   ├── CONNECTION_MANAGEMENT.md   # Database connection management
│   ├── DEVELOPMENT_STATUS.md      # Development status
│   ├── GRAPHQL_SCHEMA.md          # GraphQL API documentation
│   ├── HEALTH_CHECK_SYSTEM.md     # Health monitoring system
│   ├── IMPLEMENTATION_COMPLETE.md # Implementation status
│   ├── IMPLEMENTATION_SUMMARY.md  # Implementation summary
│   ├── PHASE1_COMPLETE.md         # Phase 1 completion
│   ├── PHASE2_STATUS.md           # Phase 2 status
│   ├── PROJECT_STRUCTURE.md       # This document
│   ├── QUICK_TEST_GUIDE.md        # Quick testing guide
│   ├── README.md                  # Documentation index
│   ├── SETUP.md                   # Setup guide
│   ├── SYSTEM_SETTINGS_GUIDE.md   # System settings
│   └── TESTING_GUIDE.md           # Testing guide
│
├── 📁 scripts/                    # Automation scripts
│   ├── deploy.sh                  # Deployment script
│   ├── migrate-secrets-to-vault.sh # Vault migration
│   ├── setup-local.sh             # Local setup automation
│   └── vault-init.sh              # Vault initialization
│
├── 📁 azure-pipelines/            # Azure DevOps CI/CD
│   └── azure-pipelines.yml        # Pipeline configuration
│
├── 📁 node_modules/               # Root dependencies
├── 📁 .github/workflows/          # GitHub Actions (if present)
│
├── 📄 docker-compose.yml          # Base Docker configuration
├── 📄 docker-compose.dev.yml      # Development overrides
├── 📄 docker-compose.prod.yml     # Production overrides
├── 📄 docker-compose.vault.yml    # Vault integration
├── 📄 .env.local                  # Environment variables
├── 📄 package.json                # Root package configuration
├── 📄 package-lock.json           # Dependency lock file
├── 📄 README.md                   # Main project documentation
├── 📄 LICENSE                     # AGPL-3.0 license
├── 📄 CODE_OF_CONDUCT.md          # Code of conduct
├── 📄 commits.md                  # Commit history
├── 📄 DEPLOYMENT_SUMMARY.md       # Deployment summary
├── 📄 LICENSE_UPDATE_SUMMARY.md   # License update summary
├── 📄 pull_request_template.md    # PR template
├── 📄 start-masterfabric.sh       # Quick start script
└── 📄 reboot-masterfabric.sh      # Reboot script
```

## 🔧 Service Details

### API Gateway (Port 3002)
**Purpose**: True API Gateway with enterprise features
**Technology**: NestJS, TypeScript
**Key Features**:
- Rate limiting (100 requests/minute)
- Redis-based response caching (5-minute TTL)
- Comprehensive request/response logging
- Apollo Federation for unified GraphQL schema
- Health monitoring integration

**Modules**:
- `cache/` - Redis caching implementation
- `health/` - Health check endpoints
- `rate-limit/` - Request throttling
- `core/routing/` - Request routing logic
- `interceptors/` - Logging interceptors

### Core Service (Port 3005)
**Purpose**: Platform authentication and business logic
**Technology**: NestJS, TypeScript, Prisma
**Key Features**:
- JWT-based authentication
- User and organization management
- Project and schema management
- Multi-tenant user management
- Health monitoring

**Modules**:
- `auth/` - Authentication system (16 files)
- `users/` - User management (6 files)
- `organizations/` - Organization management (8 files)
- `projects/` - Project management (7 files)
- `project-schemas/` - Schema management (6 files)
- `tenant-users/` - Tenant user management (7 files)
- `health/` - Health monitoring (5 files)

### Provisioning Service (Port 3003)
**Purpose**: Infrastructure and tenant provisioning
**Technology**: NestJS, TypeScript, GraphQL
**Key Features**:
- Async tenant provisioning
- Cloudflare DNS integration
- Redis microservice management
- GraphQL API for provisioning operations

**Structure**:
- `graphql/` - GraphQL schema definitions (2 files)
- `modules/` - Service modules (5 files)
- `prisma/` - Database layer

### Tenant Runtime (Port 3004)
**Purpose**: Dynamic GraphQL API with multi-tenant isolation
**Technology**: NestJS, TypeScript, Prisma
**Key Features**:
- Dynamic GraphQL schema generation
- Request-scoped tenant isolation
- Multi-tenant database context
- Real-time data access

**Structure**:
- `core/` - Core functionality (5 files)
- `modules/` - Runtime modules (18 files)
- `prisma/` - Database layer

### Dashboard (Port 3000)
**Purpose**: Admin interface and user management
**Technology**: Next.js 14, TypeScript, shadcn/ui, Tailwind CSS
**Key Features**:
- Modern admin interface
- Real-time health monitoring
- Connection management
- Project and user management
- Responsive design

**Structure**:
- `app/` - Next.js 14 app router (12 files)
- `components/` - React components (10 files)
- `lib/` - Utilities and helpers (3 files)

## 🗄️ Database Architecture

### PostgreSQL 15
- **Primary Database**: Core service data
- **Multi-tenant**: Organization-based isolation
- **Schema Management**: Dynamic schema creation
- **Migrations**: Prisma-based migrations

### Redis
- **Caching**: API Gateway response caching
- **Rate Limiting**: Request throttling storage
- **Session Management**: User session storage
- **Queue Management**: Async task processing

## 🚀 Deployment Architecture

### Development
```bash
# Local development with hot reload
docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production
```bash
# Production deployment
docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up
```

### With Vault
```bash
# Secure secrets management
docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.vault.yml up
```

## 📊 Service Communication

### GraphQL Federation
- **API Gateway** acts as the federation gateway
- **All services** expose GraphQL endpoints
- **Unified schema** across all services
- **Type-safe** communication

### Health Monitoring
- **Real-time status** indicators
- **Auto-polling** every 30 seconds
- **Service isolation** monitoring
- **Performance tracking**

## 🔐 Security Architecture

### Authentication
- **JWT tokens** for all API access
- **Multi-tenant isolation** at database level
- **Request-scoped** tenant context
- **Password hashing** with bcrypt

### Network Security
- **Docker networking** isolation
- **Environment-based** configuration
- **Vault integration** for secrets
- **HTTPS/TLS** via Cloudflare proxy

## 📈 Monitoring & Observability

### Health Checks
- **Service-level** health endpoints
- **Database connectivity** monitoring
- **Redis connectivity** monitoring
- **Response time** tracking

### Logging
- **Request/response** logging
- **Error tracking** and reporting
- **Performance metrics** collection
- **Audit trail** maintenance

## 🛠️ Development Workflow

### Local Development
1. **Setup**: Run `./scripts/setup-local.sh`
2. **Start**: Use `./start-masterfabric.sh`
3. **Develop**: Hot reload enabled for all services
4. **Test**: Use GraphQL Playground at `http://localhost:3002/graphql`

### CI/CD Pipeline
- **Azure DevOps** pipelines configured
- **GitHub Actions** workflows (if present)
- **Automated testing** and deployment
- **Environment promotion** strategy

## 📚 Documentation Structure

The documentation is organized into logical sections:

- **Architecture & Development**: Technical architecture and development status
- **Setup & Testing**: Installation, configuration, and testing guides
- **System Management**: Operational guides for system administration
- **API & Schema**: API documentation and GraphQL schemas
- **Project Phases**: Development milestones and completion status

## 🎯 Key Benefits

### Scalability
- **Microservices architecture** for independent scaling
- **Horizontal scaling** capability
- **Load balancing** ready
- **Database optimization** for multi-tenancy

### Maintainability
- **Clear separation** of concerns
- **Modular architecture** for easy updates
- **Comprehensive documentation** for all components
- **Automated deployment** and testing

### Security
- **Multi-tenant isolation** at all levels
- **Secure authentication** and authorization
- **Environment-based** configuration
- **Audit trail** and monitoring

### Developer Experience
- **Type-safe** development with TypeScript
- **GraphQL** for efficient API development
- **Hot reload** for rapid development
- **Comprehensive testing** tools and guides

---

**Last Updated**: 2025
**Version**: 2.0 - True API Gateway with Enterprise Features Complete
