#!/bin/bash

# Local Development Setup Script
# This script sets up the MasterFabric development environment

set -e

echo "🚀 Setting up MasterFabric Local Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine docker compose command
get_docker_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo ""
    fi
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop.${NC}"
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose.${NC}"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}⚠️  Node.js is not installed. Some features may not work.${NC}"
    fi
    
    echo -e "${GREEN}✅ Prerequisites check completed${NC}"
}

# Setup environment file
setup_environment() {
    echo -e "${BLUE}📝 Setting up environment configuration...${NC}"
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.local.example" ]; then
            cp .env.local.example .env.local
            echo -e "${GREEN}✅ Created .env.local from example${NC}"
        else
            # Create basic .env.local
            cat > .env.local << EOF
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
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
EOF
            echo -e "${GREEN}✅ Created basic .env.local${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  .env.local already exists, skipping...${NC}"
    fi
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    # Install dependencies for each service
    for service in api-gateway core-service provisioning-service tenant-runtime dashboard; do
        if [ -d "services/$service" ]; then
            echo -e "${BLUE}📦 Installing dependencies for $service...${NC}"
            cd "services/$service"
            if [ -f "package.json" ]; then
                npm install
            fi
            cd ../..
        fi
    done
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Setup database
setup_database() {
    echo -e "${BLUE}🗄️  Setting up database...${NC}"
    
    # Start database services with environment file
    local docker_compose_cmd=$(get_docker_compose_cmd)
    $docker_compose_cmd --env-file .env.local up -d postgres_core redis_cache
    
    # Wait for database to be ready
    echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
    sleep 10
    
    # Run database migrations
    echo -e "${BLUE}🔄 Running database migrations...${NC}"
    cd services/core-service
    npx prisma migrate deploy
    cd ../..
    
    echo -e "${GREEN}✅ Database setup completed${NC}"
}

# Build Docker images
build_images() {
    echo -e "${BLUE}🐳 Building Docker images...${NC}"
    
    # Build all service images with environment file
    local docker_compose_cmd=$(get_docker_compose_cmd)
    $docker_compose_cmd --env-file .env.local build
    
    echo -e "${GREEN}✅ Docker images built${NC}"
}

# Start services
start_services() {
    echo -e "${BLUE}🚀 Starting services...${NC}"
    
    # Start all services with environment file
    local docker_compose_cmd=$(get_docker_compose_cmd)
    $docker_compose_cmd --env-file .env.local -f docker-compose.yml -f docker-compose.dev.yml up -d
    
    echo -e "${GREEN}✅ Services started${NC}"
}

# Health check
health_check() {
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Wait for services to be ready
    sleep 30
    
    # Check each service
    services=(
        "http://localhost:3002/health:API Gateway"
        "http://localhost:3005/health:Core Service"
        "http://localhost:3003/health:Provisioning Service"
        "http://localhost:3004/health:Tenant Runtime"
        "http://localhost:3000:Dashboard"
    )
    
    for service in "${services[@]}"; do
        url=$(echo $service | cut -d: -f1-3)
        name=$(echo $service | cut -d: -f4)
        
        if curl -f -s "$url" > /dev/null; then
            echo -e "${GREEN}✅ $name is healthy${NC}"
        else
            echo -e "${RED}❌ $name is not responding${NC}"
        fi
    done
}

# Display information
display_info() {
    echo -e "${GREEN}🎉 MasterFabric Local Development Environment Setup Complete!${NC}"
    echo ""
    echo -e "${BLUE}📊 Service URLs:${NC}"
    echo -e "  Dashboard: ${GREEN}http://localhost:3000${NC}"
    echo -e "  API Gateway: ${GREEN}http://localhost:3002${NC}"
    echo -e "  Core Service: ${GREEN}http://localhost:3005${NC}"
    echo -e "  Provisioning Service: ${GREEN}http://localhost:3003${NC}"
    echo -e "  Tenant Runtime: ${GREEN}http://localhost:3004${NC}"
    echo ""
    echo -e "${BLUE}🔧 Development Tools:${NC}"
    echo -e "  Prisma Studio: ${GREEN}http://localhost:5555${NC}"
    echo -e "  GraphQL Playground: ${GREEN}http://localhost:3002/graphql${NC}"
    echo ""
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo -e "  View logs: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "  Stop services: ${YELLOW}docker-compose down${NC}"
    echo -e "  Restart services: ${YELLOW}docker-compose restart${NC}"
    echo -e "  Database studio: ${YELLOW}cd services/core-service && npx prisma studio${NC}"
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo -e "  Local Development: ${GREEN}docs/deployment/LOCAL_DEVELOPMENT.md${NC}"
    echo -e "  Production Deployment: ${GREEN}docs/deployment/PRODUCTION_DEPLOYMENT.md${NC}"
}

# Main execution
main() {
    check_prerequisites
    setup_environment
    install_dependencies
    setup_database
    build_images
    start_services
    health_check
    display_info
}

# Run main function
main "$@"
