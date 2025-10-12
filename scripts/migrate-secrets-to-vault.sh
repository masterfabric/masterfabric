#!/bin/bash

# Migrate .env.local secrets to HashiCorp Vault
# This script reads .env.local and populates Vault with the secrets

set -e

VAULT_ADDR="http://localhost:8200"
VAULT_TOKEN="masterfabric-root-token"

echo "🔄 Migrating secrets from .env.local to Vault..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    exit 1
fi

# Check if Vault is running
if ! curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null; then
    echo "❌ Vault is not running at $VAULT_ADDR"
    echo "Please start Vault first: docker-compose -f docker-compose.yml -f docker-compose.vault.yml up vault"
    exit 1
fi

# Read .env.local and extract secrets
echo "📖 Reading .env.local..."

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

echo "🔑 Updating Core Service secrets..."
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

echo "🔑 Updating API Gateway secrets..."
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

echo "🔑 Updating Provisioning Service secrets..."
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

echo "🔑 Updating Tenant Runtime secrets..."
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

echo "✅ Secrets migration completed!"
echo "🔍 You can verify the secrets in Vault UI: http://localhost:8200"
echo "🔑 Root token: $VAULT_TOKEN"
