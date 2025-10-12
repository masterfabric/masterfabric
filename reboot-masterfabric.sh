#!/bin/bash

# =============================================================================
# 🔄 MasterFabric Platform Reboot Script
# =============================================================================
# A beautiful, professional reboot script for the MasterFabric BaaS Platform
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

# ASCII Art Banner
print_banner() {
    echo -e "${CYAN}"
    echo ""
    echo "  ╔═══════════════════════════════════════════════════════════════════╗"
    echo "  ║                                                                   ║"
    echo "  ║        ███╗   ███╗ █████╗ ███████╗████████╗███████╗██████╗       ║"
    echo "  ║        ████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗      ║"
    echo "  ║        ██╔████╔██║███████║███████╗   ██║   █████╗  ██████╔╝      ║"
    echo "  ║        ██║╚██╔╝██║██╔══██║╚════██║   ██║   ██╔══╝  ██╔══██╗      ║"
    echo "  ║        ██║ ╚═╝ ██║██║  ██║███████║   ██║   ███████╗██║  ██║      ║"
    echo "  ║        ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝      ║"
    echo "  ║                                                                   ║"
    echo "  ║        ███████╗ █████╗ ██████╗ ██████╗ ██╗ ██████╗               ║"
    echo "  ║        ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝               ║"
    echo "  ║        █████╗  ███████║██████╔╝██████╔╝██║██║                    ║"
    echo "  ║        ██╔══╝  ██╔══██║██╔══██╗██╔══██╗██║██║                    ║"
    echo "  ║        ██║     ██║  ██║██████╔╝██████╔╝██║╚██████╗               ║"
    echo "  ║        ╚═╝     ╚═╝  ╚═╝╚═════╝ ╚═════╝ ╚═╝ ╚═════╝               ║"
    echo "  ║                                                                   ║"
    echo "  ╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "${WHITE}${BOLD}              🔄 Platform Reboot & Restart 🔄${NC}"
    echo -e "${PURPLE}              Clean • Fast • Reliable${NC}"
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

# Kill all processes
kill_all_processes() {
    echo -e "${RED}${BOLD}🛑 Stopping All Services...${NC}"
    
    show_progress 1 6 "Killing Node.js processes..."
    pkill -f "npm run start:dev" >/dev/null 2>&1
    pkill -f "npm run dev" >/dev/null 2>&1
    pkill -f "nest start" >/dev/null 2>&1
    pkill -f "next dev" >/dev/null 2>&1
    pkill -f "prisma studio" >/dev/null 2>&1
    sleep 2
    
    show_progress 2 6 "Killing Docker containers..."
    docker-compose down >/dev/null 2>&1
    sleep 2
    
    show_progress 3 6 "Cleaning up ports..."
    lsof -ti:3000,3002,3003,3004,3005,5432,6379 | xargs kill -9 >/dev/null 2>&1
    sleep 2
    
    show_progress 4 6 "Clearing Docker cache..."
    docker system prune -f >/dev/null 2>&1
    sleep 2
    
    show_progress 5 6 "Removing unused volumes..."
    docker volume prune -f >/dev/null 2>&1
    sleep 2
    
    show_progress 6 6 "Cleanup complete!"
    echo ""
    echo -e "${GREEN}✅ All services stopped and cleaned up${NC}"
    echo ""
}

# Clear logs and cache
clear_logs_cache() {
    echo -e "${BLUE}${BOLD}🧹 Clearing Logs and Cache...${NC}"
    
    show_progress 1 4 "Clearing npm cache..."
    npm cache clean --force >/dev/null 2>&1
    sleep 1
    
    show_progress 2 4 "Clearing Next.js cache..."
    find . -name ".next" -type d -exec rm -rf {} + >/dev/null 2>&1
    sleep 1
    
    show_progress 3 4 "Clearing TypeScript cache..."
    find . -name "dist" -type d -exec rm -rf {} + >/dev/null 2>&1
    sleep 1
    
    show_progress 4 4 "Cache cleared!"
    echo ""
    echo -e "${GREEN}✅ Logs and cache cleared${NC}"
    echo ""
}

# Restart infrastructure
restart_infrastructure() {
    echo -e "${BLUE}${BOLD}🏗️  Restarting Infrastructure...${NC}"
    
    show_progress 1 3 "Starting PostgreSQL..."
    docker-compose up -d postgres_core >/dev/null 2>&1
    sleep 3
    
    show_progress 2 3 "Starting Redis..."
    docker-compose up -d redis_cache >/dev/null 2>&1
    sleep 3
    
    show_progress 3 3 "Infrastructure ready!"
    echo ""
    echo -e "${GREEN}✅ Infrastructure services restarted${NC}"
    echo ""
}

# Restart application services
restart_services() {
    echo -e "${BLUE}${BOLD}🚀 Restarting Application Services...${NC}"
    
    show_progress 1 5 "Starting Core Service..."
    cd services/core-service && npm run start:dev >/dev/null 2>&1 &
    sleep 4
    
    show_progress 2 5 "Starting Provisioning Service..."
    cd ../provisioning-service && npm run start:dev >/dev/null 2>&1 &
    sleep 4
    
    show_progress 3 5 "Starting Tenant Runtime..."
    cd ../tenant-runtime && npm run start:dev >/dev/null 2>&1 &
    sleep 4
    
    show_progress 4 5 "Starting API Gateway..."
    cd ../api-gateway && npm run start:dev >/dev/null 2>&1 &
    sleep 4
    
    show_progress 5 5 "Starting Dashboard..."
    cd ../dashboard && npm run dev >/dev/null 2>&1 &
    sleep 3
    
    echo ""
    echo -e "${PURPLE}${BOLD}📊 Starting Prisma Studio (port 5555)...${NC}"
    cd ../core-service && npx prisma studio --port 5555 >/dev/null 2>&1 &
    sleep 2
    
    cd ../..
    echo ""
    echo -e "${GREEN}✅ All application services restarted${NC}"
    echo ""
}

# Health check
health_check() {
    echo -e "${BLUE}${BOLD}🏥 Performing Health Check...${NC}"
    
    local attempts=0
    local max_attempts=12
    local all_healthy=false
    
    while [ $attempts -lt $max_attempts ] && [ "$all_healthy" = false ]; do
        attempts=$((attempts + 1))
        
        local core_ok=false
        local provisioning_ok=false
        local tenant_ok=false
        local gateway_ok=false
        local dashboard_ok=false
        
        # Check Core Service
        if curl -s http://localhost:3005/health >/dev/null 2>&1; then
            core_ok=true
        fi
        
        # Check Provisioning Service
        if curl -s http://localhost:3003/health >/dev/null 2>&1; then
            provisioning_ok=true
        fi
        
        # Check Tenant Runtime
        if curl -s http://localhost:3004/health >/dev/null 2>&1; then
            tenant_ok=true
        fi
        
        # Check API Gateway
        if curl -s http://localhost:3002/health >/dev/null 2>&1; then
            gateway_ok=true
        fi
        
        # Check Dashboard
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            dashboard_ok=true
        fi
        
        if [ "$core_ok" = true ] && [ "$provisioning_ok" = true ] && [ "$tenant_ok" = true ] && [ "$gateway_ok" = true ] && [ "$dashboard_ok" = true ]; then
            all_healthy=true
        else
            show_progress $attempts $max_attempts "Waiting for services to be ready... (attempt $attempts/$max_attempts)"
            sleep 5
        fi
    done
    
    echo ""
    if [ "$all_healthy" = true ]; then
        echo -e "${GREEN}${BOLD}🎉 All services are healthy and responding!${NC}"
    else
        echo -e "${YELLOW}${BOLD}⚠️  Some services may still be starting up...${NC}"
    fi
    echo ""
}

# Show final status
show_final_status() {
    echo -e "${PURPLE}${BOLD}📊 Final Service Status:${NC}"
    echo ""
    
    # Check each service
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
    
    echo ""
    echo -e "${PURPLE}${BOLD}🌐 Service URLs:${NC}"
    echo -e "${WHITE}${BOLD}📊 Dashboard:${NC}           ${CYAN}http://localhost:3000${NC}"
    echo -e "${WHITE}${BOLD}🔗 API Gateway:${NC}         ${CYAN}http://localhost:3002${NC}"
    echo -e "${WHITE}${BOLD}🏢 Core Service:${NC}        ${CYAN}http://localhost:3005${NC}"
    echo -e "${WHITE}${BOLD}⚙️  Provisioning:${NC}       ${CYAN}http://localhost:3003${NC}"
    echo -e "${WHITE}${BOLD}🏃 Tenant Runtime:${NC}      ${CYAN}http://localhost:3004${NC}"
    echo -e "${WHITE}${BOLD}🗄️  Prisma Studio:${NC}      ${CYAN}http://localhost:5555${NC}"
    echo ""
}

# Show help
show_help() {
    echo -e "${WHITE}${BOLD}Usage:${NC}"
    echo -e "  ${CYAN}./reboot-masterfabric.sh${NC}           Reboot all services"
    echo -e "  ${CYAN}./reboot-masterfabric.sh --help${NC}    Show this help"
    echo -e "  ${CYAN}./reboot-masterfabric.sh --quick${NC}   Quick reboot (skip cache clearing)"
    echo ""
    echo -e "${WHITE}${BOLD}Options:${NC}"
    echo -e "  ${YELLOW}--help${NC}     Show this help message"
    echo -e "  ${YELLOW}--quick${NC}    Quick reboot without clearing cache"
    echo ""
}

# Quick reboot (skip cache clearing)
quick_reboot() {
    echo -e "${YELLOW}${BOLD}⚡ Quick Reboot Mode${NC}"
    echo ""
    
    kill_all_processes
    restart_infrastructure
    restart_services
    sleep 10
    health_check
    show_final_status
    
    echo -e "${GREEN}${BOLD}⚡ Quick reboot completed!${NC}"
}

# Full reboot
full_reboot() {
    echo -e "${BLUE}${BOLD}🔄 Full Reboot Mode${NC}"
    echo ""
    
    kill_all_processes
    clear_logs_cache
    restart_infrastructure
    restart_services
    sleep 10
    health_check
    show_final_status
    
    echo -e "${GREEN}${BOLD}🎊 Full reboot completed successfully!${NC}"
}

# Main execution
main() {
    case "${1:-}" in
        --help|-h)
            print_banner
            show_help
            ;;
        --quick|-q)
            print_banner
            quick_reboot
            ;;
        "")
            print_banner
            full_reboot
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
