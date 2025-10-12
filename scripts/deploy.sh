#!/bin/bash

# Production Deployment Script
# This script deploys MasterFabric to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_DIR="/opt/backups/masterfabric"
APP_DIR="/opt/masterfabric"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        error "Please do not run this script as root"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check if in correct directory
    if [ ! -f "docker-compose.yml" ]; then
        error "docker-compose.yml not found. Please run from project root"
    fi
    
    success "Prerequisites check completed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Database backup
    log "Backing up database..."
    docker-compose exec -T postgres_core pg_dump -U postgres masterfabric > "$BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql"
    
    # Volume backup
    log "Backing up volumes..."
    docker run --rm -v masterfabric_postgres_data:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/volumes_$(date +%Y%m%d_%H%M%S).tar.gz" -C /data .
    
    # Cleanup old backups (keep 30 days)
    find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
    
    success "Backup created successfully"
}

# Pull latest images
pull_images() {
    log "Pulling latest images..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml pull
    else
        docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.dev.yml pull
    fi
    
    success "Images pulled successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Run migrations
    docker-compose exec core-service npx prisma migrate deploy
    
    success "Database migrations completed"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        # Rolling update for production
        log "Performing rolling update..."
        
        # Update services one by one
        docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build core-service
        sleep 10
        
        docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build api-gateway
        sleep 10
        
        docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build provisioning-service
        sleep 10
        
        docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build tenant-runtime
        sleep 10
        
        docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build dashboard
    else
        # Development deployment
        docker-compose --env-file .env.local -f docker-compose.yml -f docker-compose.dev.yml up -d --build
    fi
    
    success "Services deployed successfully"
}

# Health check
health_check() {
    log "Running health checks..."
    
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
    
    failed_services=()
    
    for service in "${services[@]}"; do
        url=$(echo $service | cut -d: -f1-3)
        name=$(echo $service | cut -d: -f4)
        
        if curl -f -s "$url" > /dev/null; then
            success "$name is healthy"
        else
            error "$name is not responding"
            failed_services+=("$name")
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        error "Health check failed for: ${failed_services[*]}"
    fi
    
    success "All health checks passed"
}

# Test GraphQL endpoints
test_graphql() {
    log "Testing GraphQL endpoints..."
    
    # Test API Gateway GraphQL
    if curl -f -X POST http://localhost:3002/graphql \
        -H "Content-Type: application/json" \
        -d '{"query":"{ __schema { types { name } } }"}' > /dev/null; then
        success "API Gateway GraphQL is working"
    else
        error "API Gateway GraphQL is not responding"
    fi
    
    success "GraphQL endpoints tested successfully"
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    success "Cleanup completed"
}

# Rollback function
rollback() {
    warning "Rolling back deployment..."
    
    # Stop current services
    docker-compose down
    
    # Restore from backup
    if [ -f "$BACKUP_DIR/db_latest.sql" ]; then
        log "Restoring database..."
        docker-compose up -d postgres_core
        sleep 10
        docker-compose exec -T postgres_core psql -U postgres masterfabric < "$BACKUP_DIR/db_latest.sql"
    fi
    
    # Start previous version
    docker-compose up -d
    
    success "Rollback completed"
}

# Main deployment function
deploy() {
    log "Starting deployment to $ENVIRONMENT environment..."
    
    check_prerequisites
    create_backup
    pull_images
    run_migrations
    deploy_services
    health_check
    test_graphql
    cleanup
    
    success "Deployment to $ENVIRONMENT completed successfully!"
    
    # Display service URLs
    echo ""
    log "Service URLs:"
    echo "  Dashboard: http://localhost:3000"
    echo "  API Gateway: http://localhost:3002"
    echo "  GraphQL Playground: http://localhost:3002/graphql"
    echo "  Health Check: http://localhost:3002/health"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "backup")
        create_backup
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|health|backup] [environment]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application (default)"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Run health checks"
        echo "  backup   - Create backup only"
        echo ""
        echo "Environments:"
        echo "  production - Production deployment (default)"
        echo "  development - Development deployment"
        exit 1
        ;;
esac
