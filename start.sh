#!/bin/bash

# =============================================================================
# MasterFabric - Quick Start Script
# =============================================================================
# Starts the entire project with a single command
# Usage: ./start.sh
# =============================================================================

set -e

# Find the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║              🚀 MasterFabric Quick Start 🚀              ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

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
    local docker_compose_cmd=$(get_docker_compose_cmd)
    if [ -z "$docker_compose_cmd" ]; then
        echo -e "${RED}❌ Docker Compose is not installed.${NC}"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker ps >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker daemon is not running...${NC}"
        
        # Try to start Docker Desktop on macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo -e "${BLUE}  → Starting Docker Desktop...${NC}"
            open -a Docker
            
            # Wait for Docker to start
            echo -e "${BLUE}  ⏳ Waiting for Docker Desktop to start (maximum 60 seconds)...${NC}"
            local wait_count=0
            while [ $wait_count -lt 60 ]; do
                if docker ps >/dev/null 2>&1; then
                    echo -e "${GREEN}  ✅ Docker Desktop started!${NC}"
                    sleep 3  # Extra wait
                    break
                fi
                sleep 2
                wait_count=$((wait_count + 2))
                echo -e "${BLUE}  ⏳ Waiting... ($wait_count/60 seconds)${NC}"
            done
            
            # If still not running, show error
            if ! docker ps >/dev/null 2>&1; then
                echo -e "${RED}❌ Failed to start Docker Desktop. Please start it manually.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Docker daemon is not running. Please start Docker.${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Prerequisites check completed${NC}"
}

# Create directory structure
create_directories() {
    echo -e "${BLUE}📁 Creating directory structure...${NC}"
    
    mkdir -p ./data/postgres
    mkdir -p ./data/postgres/backups
    mkdir -p ./data/redis
    mkdir -p ./data/vault
    mkdir -p ./logs/vault
    
    echo -e "${GREEN}✅ Directory structure ready${NC}"
}

# Setup environment file
setup_environment() {
    echo -e "${BLUE}📝 Checking environment file...${NC}"
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.local.example" ]; then
            cp .env.local.example .env.local
            echo -e "${GREEN}✅ .env.local file created${NC}"
            echo -e "${YELLOW}⚠️  You can edit .env.local file if needed${NC}"
        else
            echo -e "${RED}❌ .env.local.example file not found${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  .env.local already exists, using it...${NC}"
    fi
}

# Start services with Docker Compose
start_services() {
    echo -e "${BLUE}🐳 Starting Docker services...${NC}"
    
    local docker_compose_cmd=$(get_docker_compose_cmd)
    
    # Start infrastructure services first
    echo -e "${BLUE}  → Starting PostgreSQL and Redis...${NC}"
    $docker_compose_cmd --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d postgres_core redis_cache
    
    # Wait for database to be ready
    echo -e "${BLUE}  ⏳ Waiting for database to be ready...${NC}"
    sleep 15
    
    # Start all services
    echo -e "${BLUE}  → Starting all services...${NC}"
    $docker_compose_cmd --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d --build
    
    echo -e "${GREEN}✅ Services started${NC}"
}

# Health check
wait_for_services() {
    echo -e "${BLUE}🏥 Waiting for services to be ready...${NC}"
    
    local max_attempts=30
    local attempt=0
    local docker_compose_cmd=$(get_docker_compose_cmd)
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        echo -e "${BLUE}  ⏳ Check $attempt/$max_attempts...${NC}"
        
        # Check health check endpoints
        if curl -f -s http://localhost:3002/health >/dev/null 2>&1 && \
           curl -f -s http://localhost:3005/health >/dev/null 2>&1 && \
           curl -f -s http://localhost:3003/health >/dev/null 2>&1 && \
           curl -f -s http://localhost:3004/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ All services ready!${NC}"
            return 0
        fi
        
        sleep 5
    done
    
    echo -e "${YELLOW}⚠️  Some services are not ready yet, but started${NC}"
    return 1
}

# Show service status
show_status() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 MasterFabric started successfully!${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}📊 Service URLs:${NC}"
    echo -e "  🎨 Dashboard:          ${GREEN}http://localhost:3000${NC}"
    echo -e "  🌐 API Gateway:         ${GREEN}http://localhost:3002${NC}"
    echo -e "  🔧 Core Service:        ${GREEN}http://localhost:3005${NC}"
    echo -e "  ⚙️  Provisioning:       ${GREEN}http://localhost:3003${NC}"
    echo -e "  🏃 Tenant Runtime:      ${GREEN}http://localhost:3004${NC}"
    echo ""
    echo -e "${BLUE}🛠️  Development Tools:${NC}"
    echo -e "  📊 Prisma Studio:       ${GREEN}http://localhost:5555${NC}"
    echo -e "  🔴 Redis Commander:     ${GREEN}http://localhost:8081${NC}"
    echo -e "  🎮 GraphQL Playground:  ${GREEN}http://localhost:3002/graphql${NC}"
    echo ""
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo -e "  View logs:              ${YELLOW}docker compose --env-file .env.local logs -f${NC}"
    echo -e "  Stop services:          ${YELLOW}docker compose --env-file .env.local down${NC}"
    echo -e "  Restart services:       ${YELLOW}docker compose --env-file .env.local restart${NC}"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
}

# Main function
main() {
    check_prerequisites
    create_directories
    setup_environment
    start_services
    wait_for_services
    show_status
}

# Run the script
main "$@"

