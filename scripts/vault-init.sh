#!/bin/bash

# =============================================================================
# 🔐 MasterFabric Vault Initialization Script
# =============================================================================
# A modern, professional Vault setup script for the MasterFabric BaaS Platform
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
    echo -e "${WHITE}${BOLD}🔐 Vault Initialization${NC}"
    echo -e "${PURPLE}Secure • Modern • Production-Ready${NC}"
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
echo -e "${BLUE}${BOLD}🔐 Initializing HashiCorp Vault for MasterFabric...${NC}"

# Wait for Vault to be ready
show_progress 1 6 "Waiting for Vault to be ready..."
until curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null; do
  sleep 2
done
echo ""

# Enable KV secrets engine
show_progress 2 6 "Enabling KV secrets engine..."
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"type": "kv-v2"}' \
  "$VAULT_ADDR/v1/sys/mounts/secret" > /dev/null
echo ""

# Create secrets for each service
show_progress 3 6 "Creating secrets for services..."

# Core Service secrets
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "data": {
      "DATABASE_URL": "postgresql://postgres:postgres123@postgres_core:5432/masterfabric",
      "JWT_SECRET": "your-super-secret-jwt-key-change-in-production",
      "JWT_EXPIRES_IN": "7d",
      "REDIS_HOST": "redis_cache",
      "REDIS_PORT": "6379"
    }
  }' \
  "$VAULT_ADDR/v1/secret/data/core-service"

# API Gateway secrets
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "data": {
      "REDIS_HOST": "redis_cache",
      "REDIS_PORT": "6379",
      "CORE_SERVICE_URL": "http://core-service:3005/graphql",
      "PROVISIONING_SERVICE_URL": "http://provisioning-service:3003/graphql",
      "TENANT_RUNTIME_URL": "http://tenant-runtime:3004/graphql",
      "RATE_LIMIT_TTL": "60000",
      "RATE_LIMIT_MAX": "100",
      "CACHE_TTL": "300"
    }
  }' \
  "$VAULT_ADDR/v1/secret/data/api-gateway"

# Provisioning Service secrets
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "data": {
      "DATABASE_URL": "postgresql://postgres:postgres123@postgres_core:5432/masterfabric",
      "REDIS_HOST": "redis_cache",
      "REDIS_PORT": "6379",
      "CLOUDFLARE_API_TOKEN": "",
      "CLOUDFLARE_ZONE_ID": ""
    }
  }' \
  "$VAULT_ADDR/v1/secret/data/provisioning-service"

# Tenant Runtime secrets
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "data": {
      "DATABASE_URL": "postgresql://postgres:postgres123@postgres_core:5432/masterfabric",
      "REDIS_HOST": "redis_cache",
      "REDIS_PORT": "6379",
      "JWT_SECRET": "your-super-secret-jwt-key-change-in-production"
    }
  }' \
  "$VAULT_ADDR/v1/secret/data/tenant-runtime"

# Dashboard secrets
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "data": {
      "NEXT_PUBLIC_API_GATEWAY_URL": "http://api-gateway:3002/graphql",
      "NEXT_PUBLIC_TENANT_RUNTIME_URL": "http://tenant-runtime:3004/graphql"
    }
  }' \
  "$VAULT_ADDR/v1/secret/data/dashboard"

# Create policies for each service
show_progress 4 6 "Creating Vault policies..."

# Core Service policy
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "policy": "path \"secret/data/core-service\" { capabilities = [\"read\"] }"
  }' \
  "$VAULT_ADDR/v1/sys/policies/acl/core-service-policy"

# API Gateway policy
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "policy": "path \"secret/data/api-gateway\" { capabilities = [\"read\"] }"
  }' \
  "$VAULT_ADDR/v1/sys/policies/acl/api-gateway-policy"

# Provisioning Service policy
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "policy": "path \"secret/data/provisioning-service\" { capabilities = [\"read\"] }"
  }' \
  "$VAULT_ADDR/v1/sys/policies/acl/provisioning-service-policy"

# Tenant Runtime policy
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "policy": "path \"secret/data/tenant-runtime\" { capabilities = [\"read\"] }"
  }' \
  "$VAULT_ADDR/v1/sys/policies/acl/tenant-runtime-policy"

# Dashboard policy
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{
    "policy": "path \"secret/data/dashboard\" { capabilities = [\"read\"] }"
  }' \
  "$VAULT_ADDR/v1/sys/policies/acl/dashboard-policy"

# Generate tokens for each service
show_progress 5 6 "Generating service tokens..."

# Core Service token
CORE_TOKEN=$(curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"policies": ["core-service-policy"]}' \
  "$VAULT_ADDR/v1/auth/token/create" | jq -r '.auth.client_token')

# API Gateway token
API_GATEWAY_TOKEN=$(curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"policies": ["api-gateway-policy"]}' \
  "$VAULT_ADDR/v1/auth/token/create" | jq -r '.auth.client_token')

# Provisioning Service token
PROVISIONING_TOKEN=$(curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"policies": ["provisioning-service-policy"]}' \
  "$VAULT_ADDR/v1/auth/token/create" | jq -r '.auth.client_token')

# Tenant Runtime token
TENANT_RUNTIME_TOKEN=$(curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"policies": ["tenant-runtime-policy"]}' \
  "$VAULT_ADDR/v1/auth/token/create" | jq -r '.auth.client_token')

# Dashboard token
DASHBOARD_TOKEN=$(curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"policies": ["dashboard-policy"]}' \
  "$VAULT_ADDR/v1/auth/token/create" | jq -r '.auth.client_token')

# Save tokens to .env.local
show_progress 6 6 "Saving tokens to .env.local..."
cat >> .env.local << EOF

# Vault Configuration
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=$VAULT_TOKEN

# Service Tokens
CORE_SERVICE_VAULT_TOKEN=$CORE_TOKEN
API_GATEWAY_VAULT_TOKEN=$API_GATEWAY_TOKEN
PROVISIONING_SERVICE_VAULT_TOKEN=$PROVISIONING_TOKEN
TENANT_RUNTIME_VAULT_TOKEN=$TENANT_RUNTIME_TOKEN
DASHBOARD_VAULT_TOKEN=$DASHBOARD_TOKEN
EOF

echo ""
echo -e "${GREEN}${BOLD}✅ Vault initialization completed!${NC}"
echo ""
echo -e "${PURPLE}${BOLD}📊 Vault Information:${NC}"
echo -e "${WHITE}${BOLD}🔑 Root Token:${NC}     ${CYAN}$VAULT_TOKEN${NC}"
echo -e "${WHITE}${BOLD}🌐 Vault UI:${NC}       ${CYAN}http://localhost:8200${NC}"
echo -e "${WHITE}${BOLD}📝 Tokens:${NC}         ${CYAN}Saved to .env.local${NC}"
echo ""
echo -e "${GREEN}${BOLD}🎊 Vault is ready for secure secret management! 🎊${NC}"
