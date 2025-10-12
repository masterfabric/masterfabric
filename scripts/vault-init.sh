#!/bin/bash

# HashiCorp Vault Initialization Script
# This script initializes Vault and sets up secrets for MasterFabric

set -e

VAULT_ADDR="http://localhost:8200"
VAULT_TOKEN="masterfabric-root-token"

echo "🔐 Initializing HashiCorp Vault for MasterFabric..."

# Wait for Vault to be ready
echo "⏳ Waiting for Vault to be ready..."
until curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null; do
  echo "Waiting for Vault..."
  sleep 2
done

# Enable KV secrets engine
echo "📦 Enabling KV secrets engine..."
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"type": "kv-v2"}' \
  "$VAULT_ADDR/v1/sys/mounts/secret"

# Create secrets for each service
echo "🔑 Creating secrets for services..."

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
echo "📋 Creating Vault policies..."

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
echo "🎫 Generating service tokens..."

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
echo "💾 Saving tokens to .env.local..."
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

echo "✅ Vault initialization completed!"
echo "🔑 Root token: $VAULT_TOKEN"
echo "🌐 Vault UI: http://localhost:8200"
echo "📝 Tokens saved to .env.local"
