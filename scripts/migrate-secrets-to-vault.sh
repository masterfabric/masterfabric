#!/bin/bash

# =============================================================================
# 🔄 MasterFabric Secrets Migration Script
# =============================================================================
# A modern, professional script to migrate secrets to HashiCorp Vault
# Author: MasterFabric Team
# Version: 2.0.0
# =============================================================================

set -e

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

# Configuration
VAULT_ADDR="http://localhost:8200"
VAULT_TOKEN="masterfabric-root-token"

# Simple Header
print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "=========================================="
    echo "           MASTERFABRIC"
    echo "=========================================="
    echo -e "${NC}"
    echo -e "${WHITE}${BOLD}🔄 Secrets Migration${NC}"
    echo -e "${PURPLE}Secure • Automated • Production-Ready${NC}"
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

print_banner
echo -e "${BLUE}${BOLD}🔄 Migrating secrets from .env.local to Vault...${NC}"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    exit 1
fi

# Check if Vault is running
show_progress 1 6 "Checking Vault connection..."
if ! curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null; then
    echo ""
    echo -e "${RED}❌ Vault is not running at $VAULT_ADDR${NC}"
    local docker_compose_cmd=$(get_docker_compose_cmd)
    echo -e "${YELLOW}Please start Vault first: $docker_compose_cmd -f docker-compose.yml -f docker-compose.vault.yml up vault${NC}"
    exit 1
fi
echo ""

# Read .env.local and extract secrets
show_progress 2 6 "Reading .env.local..."

# Database secrets
POSTGRES_DB=$(grep "^POSTGRES_DB=" .env.local | cut -d'=' -f2 | tr -d '"')
POSTGRES_USER=$(grep "^POSTGRES_USER=" .env.local | cut -d'=' -f2 | tr -d '"')
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env.local | cut -d'=' -f2 | tr -d '"')

# Redis secrets
REDIS_HOST=$(grep "^REDIS_HOST=" .env.local | cut -d'=' -f2 | tr -d '"')
REDIS_PORT=$(grep "^REDIS_PORT=" .env.local | cut -d'=' -f2 | tr -d '"')

# JWT secrets
JWT_SECRET=$(grep "^JWT_SECRET=" .env.local | cut -d'=' -f2 | tr -d '"')
JWT_EXPIRES_IN=$(grep "^JWT_EXPIRES_IN=" .env.local | cut -d'=' -f2 | tr -d '"')

# API Gateway secrets
RATE_LIMIT_TTL=$(grep "^RATE_LIMIT_TTL=" .env.local | cut -d'=' -f2 | tr -d '"')
RATE_LIMIT_MAX=$(grep "^RATE_LIMIT_MAX=" .env.local | cut -d'=' -f2 | tr -d '"')
CACHE_TTL=$(grep "^CACHE_TTL=" .env.local | cut -d'=' -f2 | tr -d '"')

# Cloudflare secrets
CLOUDFLARE_API_TOKEN=$(grep "^CLOUDFLARE_API_TOKEN=" .env.local | cut -d'=' -f2 | tr -d '"')
CLOUDFLARE_ZONE_ID=$(grep "^CLOUDFLARE_ZONE_ID=" .env.local | cut -d'=' -f2 | tr -d '"')

# Service URLs
CORE_SERVICE_URL=$(grep "^CORE_SERVICE_URL=" .env.local | cut -d'=' -f2 | tr -d '"')
PROVISIONING_SERVICE_URL=$(grep "^PROVISIONING_SERVICE_URL=" .env.local | cut -d'=' -f2 | tr -d '"')
TENANT_RUNTIME_URL=$(grep "^TENANT_RUNTIME_URL=" .env.local | cut -d'=' -f2 | tr -d '"')

# Dashboard secrets
NEXT_PUBLIC_API_GATEWAY_URL=$(grep "^NEXT_PUBLIC_API_GATEWAY_URL=" .env.local | cut -d'=' -f2 | tr -d '"')
NEXT_PUBLIC_TENANT_RUNTIME_URL=$(grep "^NEXT_PUBLIC_TENANT_RUNTIME_URL=" .env.local | cut -d'=' -f2 | tr -d '"')

# Construct DATABASE_URL
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres_core:5432/${POSTGRES_DB}"
echo ""

show_progress 3 6 "Updating Core Service secrets..."
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d "{
    \"data\": {
      \"DATABASE_URL\": \"$DATABASE_URL\",
      \"JWT_SECRET\": \"$JWT_SECRET\",
      \"JWT_EXPIRES_IN\": \"$JWT_EXPIRES_IN\",
      \"REDIS_HOST\": \"$REDIS_HOST\",
      \"REDIS_PORT\": \"$REDIS_PORT\"
    }
  }" \
  "$VAULT_ADDR/v1/secret/data/core-service"

show_progress 4 6 "Updating API Gateway secrets..."
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d "{
    \"data\": {
      \"REDIS_HOST\": \"$REDIS_HOST\",
      \"REDIS_PORT\": \"$REDIS_PORT\",
      \"CORE_SERVICE_URL\": \"$CORE_SERVICE_URL\",
      \"PROVISIONING_SERVICE_URL\": \"$PROVISIONING_SERVICE_URL\",
      \"TENANT_RUNTIME_URL\": \"$TENANT_RUNTIME_URL\",
      \"RATE_LIMIT_TTL\": \"$RATE_LIMIT_TTL\",
      \"RATE_LIMIT_MAX\": \"$RATE_LIMIT_MAX\",
      \"CACHE_TTL\": \"$CACHE_TTL\"
    }
  }" \
  "$VAULT_ADDR/v1/secret/data/api-gateway"

show_progress 5 6 "Updating Provisioning Service secrets..."
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d "{
    \"data\": {
      \"DATABASE_URL\": \"$DATABASE_URL\",
      \"REDIS_HOST\": \"$REDIS_HOST\",
      \"REDIS_PORT\": \"$REDIS_PORT\",
      \"CLOUDFLARE_API_TOKEN\": \"$CLOUDFLARE_API_TOKEN\",
      \"CLOUDFLARE_ZONE_ID\": \"$CLOUDFLARE_ZONE_ID\"
    }
  }" \
  "$VAULT_ADDR/v1/secret/data/provisioning-service"

show_progress 6 6 "Updating Tenant Runtime secrets..."
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d "{
    \"data\": {
      \"DATABASE_URL\": \"$DATABASE_URL\",
      \"REDIS_HOST\": \"$REDIS_HOST\",
      \"REDIS_PORT\": \"$REDIS_PORT\",
      \"JWT_SECRET\": \"$JWT_SECRET\"
    }
  }" \
  "$VAULT_ADDR/v1/secret/data/tenant-runtime"

echo "🔑 Updating Dashboard secrets..."
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d "{
    \"data\": {
      \"NEXT_PUBLIC_API_GATEWAY_URL\": \"$NEXT_PUBLIC_API_GATEWAY_URL\",
      \"NEXT_PUBLIC_TENANT_RUNTIME_URL\": \"$NEXT_PUBLIC_TENANT_RUNTIME_URL\"
    }
  }" \
  "$VAULT_ADDR/v1/secret/data/dashboard"

echo ""
echo -e "${GREEN}${BOLD}✅ Secrets migration completed!${NC}"
echo ""
echo -e "${PURPLE}${BOLD}📊 Migration Summary:${NC}"
echo -e "${WHITE}${BOLD}🔍 Vault UI:${NC}        ${CYAN}http://localhost:8200${NC}"
echo -e "${WHITE}${BOLD}🔑 Root Token:${NC}      ${CYAN}$VAULT_TOKEN${NC}"
echo -e "${WHITE}${BOLD}📝 Status:${NC}          ${CYAN}All secrets migrated successfully${NC}"
echo ""
echo -e "${GREEN}${BOLD}🎊 Secrets are now securely stored in Vault! 🎊${NC}"
