#!/bin/bash

# =============================================================================
# MasterFabric - Live Development Script (Hot Reload)
# =============================================================================
# This script starts services in hot reload mode
# Your code changes are automatically detected and reflected
# Usage: ./dev-live.sh [service-name]
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
echo "║         🔥 MasterFabric Live Development 🔥                 ║"
echo "║              (Hot Reload Mode)                            ║"
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
                    sleep 3
                    break
                fi
                sleep 2
                wait_count=$((wait_count + 2))
                echo -e "${BLUE}  ⏳ Waiting... ($wait_count/60 seconds)${NC}"
            done
            
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

# Check environment file
check_environment() {
    echo -e "${BLUE}📝 Checking environment file...${NC}"
    
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}⚠️  .env.local file not found${NC}"
        echo -e "${BLUE}  → Copying from .env.local.example...${NC}"
        
        if [ -f ".env.local.example" ]; then
            cp .env.local.example .env.local
            echo -e "${GREEN}✅ .env.local file created${NC}"
            echo -e "${YELLOW}⚠️  Please review and update .env.local file if needed${NC}"
        else
            echo -e "${RED}❌ .env.local.example file not found${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ .env.local file exists${NC}"
    fi
}

# Start services with hot reload
start_services() {
    local docker_compose_cmd=$(get_docker_compose_cmd)
    local service_name="$1"
    
    echo -e "${BLUE}🐳 Starting services (Hot Reload mode)...${NC}"
    
    # Create directory structure
    mkdir -p ./data/postgres/backups
    mkdir -p ./data/redis
    mkdir -p ./data/vault
    mkdir -p ./logs/vault
    
    # Start infrastructure services first
    echo -e "${BLUE}  → Starting PostgreSQL and Redis...${NC}"
    $docker_compose_cmd --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d postgres_core redis_cache
    
    # Wait for database to be ready
    echo -e "${BLUE}  ⏳ Waiting for database to be ready...${NC}"
    sleep 15
    
    # Start specific service or all services
    if [ -n "$service_name" ]; then
        echo -e "${BLUE}  → Starting $service_name service (with hot reload)...${NC}"
        $docker_compose_cmd --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d --build "$service_name"
    else
        echo -e "${BLUE}  → Starting all services (with hot reload)...${NC}"
        $docker_compose_cmd --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up -d --build
    fi
    
    echo -e "${GREEN}✅ Services started${NC}"
}

# Show service status
show_status() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 MasterFabric Live Development Mode Active!${NC}"
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
    echo -e "${BLUE}🔥 Hot Reload Features:${NC}"
    echo -e "  ✅ Code changes are automatically detected"
    echo -e "  ✅ NestJS services automatically restart"
    echo -e "  ✅ Next.js dashboard runs with Fast Refresh"
    echo -e "  ✅ Changes reflect within 2-5 seconds after saving"
    echo ""
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo -e "  Watch logs:             ${YELLOW}docker compose --env-file .env.local logs -f${NC}"
    echo -e "  Stop services:          ${YELLOW}docker compose --env-file .env.local down${NC}"
    echo -e "  Restart services:       ${YELLOW}docker compose --env-file .env.local restart${NC}"
    echo -e "  Specific service logs:   ${YELLOW}docker compose --env-file .env.local logs -f [service-name]${NC}"
    echo ""
    echo -e "${BLUE}💡 Tips:${NC}"
    echo -e "  • Your code changes are automatically detected"
    echo -e "  • For package.json changes: restart with --build flag"
    echo -e "  • For database migrations: cd services/core-service && npx prisma migrate dev"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}💡 To view logs, open another terminal and run:${NC}"
    echo -e "${CYAN}   docker compose --env-file .env.local logs -f${NC}"
    echo ""
}

# Main function
main() {
    check_prerequisites
    check_environment
    start_services "$1"
    sleep 5
    show_status
}

# Run the script
main "$@"

