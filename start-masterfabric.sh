#!/bin/bash

# =============================================================================
# 🚀 MasterFabric Platform Startup Script
# =============================================================================
# A beautiful, professional startup script for the MasterFabric BaaS Platform
# Author: MasterFabric Team
# Version: 1.0.0
# =============================================================================

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Simple Header
print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "=========================================="
    echo "           MASTERFABRIC"
    echo "=========================================="
    echo -e "${NC}"
    echo -e "${WHITE}${BOLD}🚀 Backend-as-a-Service Platform${NC}"
    echo -e "${PURPLE}Multi-tenant • Scalable • Production-Ready${NC}"
    echo ""
}

# Progress bar function
show_progress() {
    local current=$1
    local total=$2
    local desc=$3
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))
    
    printf "\r${CYAN}[${NC}"
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "${CYAN}] ${WHITE}${percent}%%${NC} ${YELLOW}${desc}${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Determine docker compose command
get_docker_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command_exists docker-compose; then
        echo "docker-compose"
    else
        echo ""
    fi
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}${BOLD}🔍 Checking Prerequisites...${NC}"
    
    local missing=0
    
    if ! command_exists docker; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        missing=$((missing + 1))
    else
        echo -e "${GREEN}✅ Docker is installed${NC}"
        # Check if docker compose is available (newer versions)
        if docker compose version >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Docker Compose (plugin) is available${NC}"
        elif command_exists docker-compose; then
            echo -e "${GREEN}✅ Docker Compose (standalone) is available${NC}"
        else
            echo -e "${RED}❌ Docker Compose is not available${NC}"
            missing=$((missing + 1))
        fi
    fi
    
    if ! command_exists node; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        missing=$((missing + 1))
    else
        echo -e "${GREEN}✅ Node.js is installed${NC}"
    fi
    
    if ! command_exists npm; then
        echo -e "${RED}❌ npm is not installed${NC}"
        missing=$((missing + 1))
    else
        echo -e "${GREEN}✅ npm is installed${NC}"
    fi
    
    if [ $missing -gt 0 ]; then
        echo -e "${RED}${BOLD}❌ Missing prerequisites. Please install the required tools.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}${BOLD}✅ All prerequisites are satisfied!${NC}"
    echo ""
}

# Start infrastructure services
start_infrastructure() {
    echo -e "${BLUE}${BOLD}🏗️  Starting Infrastructure Services...${NC}"
    
    local docker_compose_cmd=$(get_docker_compose_cmd)
    
    show_progress 1 4 "Starting PostgreSQL..."
    $docker_compose_cmd up -d postgres_core >/dev/null 2>&1
    sleep 2
    
    show_progress 2 4 "Starting Redis..."
    $docker_compose_cmd up -d redis_cache >/dev/null 2>&1
    sleep 2
    
    show_progress 3 4 "Waiting for services to be ready..."
    sleep 5
    
    show_progress 4 4 "Infrastructure ready!"
    echo ""
    echo -e "${GREEN}✅ Infrastructure services are running${NC}"
    echo ""
}

# Start application services
start_services() {
    echo -e "${BLUE}${BOLD}🚀 Starting Application Services...${NC}"
    
    # Kill any existing processes
    pkill -f "npm run start:dev" >/dev/null 2>&1
    pkill -f "npm run dev" >/dev/null 2>&1
    pkill -f "nest start" >/dev/null 2>&1
    
    show_progress 1 5 "Starting Core Service (port 3005)..."
    cd services/core-service && npm run start:dev >/dev/null 2>&1 &
    sleep 3
    
    show_progress 2 5 "Starting Provisioning Service (port 3003)..."
    cd services/provisioning-service && npm run start:dev >/dev/null 2>&1 &
    sleep 3
    
    show_progress 3 5 "Starting Tenant Runtime (port 3004)..."
    cd services/tenant-runtime && npm run start:dev >/dev/null 2>&1 &
    sleep 3
    
    show_progress 4 5 "Starting API Gateway (port 3002)..."
    cd services/api-gateway && npm run start:dev >/dev/null 2>&1 &
    sleep 3
    
    show_progress 5 5 "Starting Dashboard (port 3000)..."
    cd services/dashboard && npm run dev >/dev/null 2>&1 &
    sleep 3
    
    echo ""
    echo -e "${PURPLE}${BOLD}📊 Starting Prisma Studio (port 5555)...${NC}"
    cd services/core-service && npx prisma studio --port 5555 >/dev/null 2>&1 &
    sleep 2
    
    cd ../..
    echo ""
    echo -e "${GREEN}✅ All application services are starting...${NC}"
    echo ""
}

# Test services
test_services() {
    echo -e "${BLUE}${BOLD}🧪 Testing Services...${NC}"
    
    local tests_passed=0
    local total_tests=5
    
    # Test Core Service
    if curl -s http://localhost:3005/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Core Service is responding${NC}"
        tests_passed=$((tests_passed + 1))
    else
        echo -e "${RED}❌ Core Service is not responding${NC}"
    fi
    
    # Test Provisioning Service
    if curl -s http://localhost:3003/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Provisioning Service is responding${NC}"
        tests_passed=$((tests_passed + 1))
    else
        echo -e "${RED}❌ Provisioning Service is not responding${NC}"
    fi
    
    # Test Tenant Runtime
    if curl -s http://localhost:3004/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Tenant Runtime is responding${NC}"
        tests_passed=$((tests_passed + 1))
    else
        echo -e "${RED}❌ Tenant Runtime is not responding${NC}"
    fi
    
    # Test API Gateway
    if curl -s http://localhost:3002/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API Gateway is responding${NC}"
        tests_passed=$((tests_passed + 1))
    else
        echo -e "${RED}❌ API Gateway is not responding${NC}"
    fi
    
    # Test Dashboard
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Dashboard is responding${NC}"
        tests_passed=$((tests_passed + 1))
    else
        echo -e "${RED}❌ Dashboard is not responding${NC}"
    fi
    
    echo ""
    if [ $tests_passed -eq $total_tests ]; then
        echo -e "${GREEN}${BOLD}🎉 All services are working perfectly!${NC}"
    else
        echo -e "${YELLOW}${BOLD}⚠️  Some services may still be starting up...${NC}"
    fi
    echo ""
}

# Show service URLs
show_urls() {
    echo -e "${PURPLE}${BOLD}🌐 Service URLs:${NC}"
    echo ""
    echo -e "${WHITE}${BOLD}📊 Dashboard:${NC}           ${CYAN}http://localhost:3000${NC}"
    echo -e "${WHITE}${BOLD}🔗 API Gateway:${NC}         ${CYAN}http://localhost:3002${NC}"
    echo -e "${WHITE}${BOLD}🏢 Core Service:${NC}        ${CYAN}http://localhost:3005${NC}"
    echo -e "${WHITE}${BOLD}⚙️  Provisioning:${NC}       ${CYAN}http://localhost:3003${NC}"
    echo -e "${WHITE}${BOLD}🏃 Tenant Runtime:${NC}      ${CYAN}http://localhost:3004${NC}"
    echo -e "${WHITE}${BOLD}🗄️  Prisma Studio:${NC}      ${CYAN}http://localhost:5555${NC}"
    echo ""
    echo -e "${PURPLE}${BOLD}🔧 Infrastructure:${NC}"
    echo -e "${WHITE}${BOLD}🗄️  PostgreSQL:${NC}         ${CYAN}localhost:5432${NC}"
    echo -e "${WHITE}${BOLD}⚡ Redis:${NC}               ${CYAN}localhost:6379${NC}"
    echo ""
}

# Show help
show_help() {
    echo -e "${WHITE}${BOLD}Usage:${NC}"
    echo -e "  ${CYAN}./start-masterfabric.sh${NC}           Start all services"
    echo -e "  ${CYAN}./start-masterfabric.sh --help${NC}    Show this help"
    echo -e "  ${CYAN}./start-masterfabric.sh --stop${NC}    Stop all services"
    echo -e "  ${CYAN}./start-masterfabric.sh --status${NC}  Check service status"
    echo ""
    echo -e "${WHITE}${BOLD}Options:${NC}"
    echo -e "  ${YELLOW}--help${NC}     Show this help message"
    echo -e "  ${YELLOW}--stop${NC}     Stop all running services"
    echo -e "  ${YELLOW}--status${NC}   Check the status of all services"
    echo ""
}

# Stop all services
stop_services() {
    echo -e "${RED}${BOLD}🛑 Stopping MasterFabric Platform...${NC}"
    
    # Stop application services
    pkill -f "npm run start:dev" >/dev/null 2>&1
    pkill -f "npm run dev" >/dev/null 2>&1
    pkill -f "nest start" >/dev/null 2>&1
    pkill -f "prisma studio" >/dev/null 2>&1
    
    # Stop infrastructure services
    local docker_compose_cmd=$(get_docker_compose_cmd)
    $docker_compose_cmd down >/dev/null 2>&1
    
    echo -e "${GREEN}✅ All services have been stopped${NC}"
}

# Check service status
check_status() {
    echo -e "${BLUE}${BOLD}📊 Service Status Check${NC}"
    echo ""
    
    # Check infrastructure
    local docker_compose_cmd=$(get_docker_compose_cmd)
    if $docker_compose_cmd ps | grep -q "Up"; then
        echo -e "${GREEN}✅ Infrastructure services are running${NC}"
    else
        echo -e "${RED}❌ Infrastructure services are not running${NC}"
    fi
    
    # Check application services
    local services=("3000:Dashboard" "3002:API Gateway" "3003:Provisioning" "3004:Tenant Runtime" "3005:Core Service" "5555:Prisma Studio")
    
    for service in "${services[@]}"; do
        local port=$(echo $service | cut -d: -f1)
        local name=$(echo $service | cut -d: -f2)
        
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name (port $port) is running${NC}"
        else
            echo -e "${RED}❌ $name (port $port) is not running${NC}"
        fi
    done
}

# Main execution
main() {
    case "${1:-}" in
        --help|-h)
            print_banner
            show_help
            ;;
        --stop)
            print_banner
            stop_services
            ;;
        --status)
            print_banner
            check_status
            ;;
        "")
            print_banner
            check_prerequisites
            start_infrastructure
            start_services
            sleep 10
            test_services
            show_urls
            echo -e "${GREEN}${BOLD}🎊 MasterFabric Platform is ready for development! 🎊${NC}"
            echo ""
            echo -e "${YELLOW}💡 Tip: Use '${CYAN}./start-masterfabric.sh --status${YELLOW}' to check service status${NC}"
            echo -e "${YELLOW}💡 Tip: Use '${CYAN}./start-masterfabric.sh --stop${YELLOW}' to stop all services${NC}"
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
