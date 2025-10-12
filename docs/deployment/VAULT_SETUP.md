# HashiCorp Vault Setup Guide

This guide covers setting up HashiCorp Vault for secure secrets management in MasterFabric.

## Overview

HashiCorp Vault provides secure storage and access to secrets like database passwords, API keys, and certificates. This setup includes:

- Vault server with persistent storage
- KV secrets engine for application secrets
- Service-specific policies and tokens
- Integration with all MasterFabric services

## Prerequisites

- Docker and Docker Compose
- Basic understanding of Vault concepts
- SSL certificates (for production)

## Development Setup

### 1. Start Vault Service

```bash
# Start Vault in development mode
docker-compose -f docker-compose.yml -f docker-compose.vault.yml up vault

# Or start all services with Vault
docker-compose -f docker-compose.yml -f docker-compose.vault.yml up
```

### 2. Initialize Vault

```bash
# Run the initialization script
./scripts/vault-init.sh
```

This script will:
- Enable KV secrets engine
- Create secrets for each service
- Generate service-specific policies
- Create authentication tokens
- Save tokens to `.env.local`

### 3. Verify Setup

```bash
# Check Vault status
curl http://localhost:8200/v1/sys/health

# List secrets
curl -H "X-Vault-Token: masterfabric-root-token" \
  http://localhost:8200/v1/secret/metadata/

# Access Vault UI
open http://localhost:8200
# Token: masterfabric-root-token
```

## Production Setup

### 1. Vault Configuration

Create production Vault configuration:

```bash
mkdir -p /opt/vault/config
nano /opt/vault/config/vault.hcl
```

```hcl
# Vault production configuration
storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = false
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file = "/vault/certs/vault.key"
}

api_addr = "https://vault.your-domain.com:8200"
cluster_addr = "https://vault.your-domain.com:8201"

ui = true

# Enable audit logging
audit {
  enabled = true
  path = "file"
  file_path = "/vault/logs/audit.log"
}

# High availability (optional)
# storage "consul" {
#   address = "consul:8500"
#   path    = "vault/"
# }
```

### 2. SSL Certificates

```bash
# Generate SSL certificates for Vault
mkdir -p /opt/vault/certs

# Using Let's Encrypt
certbot certonly --standalone -d vault.your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/vault.your-domain.com/fullchain.pem /opt/vault/certs/vault.crt
cp /etc/letsencrypt/live/vault.your-domain.com/privkey.pem /opt/vault/certs/vault.key
```

### 3. Production Docker Compose

```yaml
# docker-compose.vault-prod.yml
version: '3.8'

services:
  vault:
    image: vault:1.15
    container_name: masterfabric-vault-prod
    ports:
      - "8200:8200"
    environment:
      VAULT_ADDR: "https://vault.your-domain.com:8200"
    volumes:
      - vault_data:/vault/data
      - vault_logs:/vault/logs
      - ./vault/config:/vault/config:ro
      - ./vault/certs:/vault/certs:ro
    cap_add:
      - IPC_LOCK
    networks:
      - masterfabric-network
    restart: unless-stopped
    command: ["vault", "server", "-config=/vault/config/vault.hcl"]

volumes:
  vault_data:
    driver: local
  vault_logs:
    driver: local
```

### 4. Initialize Production Vault

```bash
# Start Vault
docker-compose -f docker-compose.yml -f docker-compose.vault-prod.yml up -d vault

# Initialize Vault (first time only)
docker-compose exec vault vault operator init -key-shares=5 -key-threshold=3

# Save the unseal keys and root token securely!
```

### 5. Unseal Vault

```bash
# Unseal with 3 of the 5 keys
docker-compose exec vault vault operator unseal <key1>
docker-compose exec vault vault operator unseal <key2>
docker-compose exec vault vault operator unseal <key3>
```

## Service Integration

### 1. Update Service Configuration

Each service now uses Vault for secrets. The VaultConfigService provides:

```typescript
// Example usage in a service
constructor(private vaultConfig: VaultConfigService) {}

async someMethod() {
  const dbUrl = this.vaultConfig.getDatabaseUrl();
  const jwtSecret = this.vaultConfig.getJwtSecret();
  const redisConfig = this.vaultConfig.getRedisConfig();
}
```

### 2. Environment Variables

Services still support environment variables as fallback:

```env
# Vault Configuration
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=your-service-token

# Fallback environment variables (optional)
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=fallback-secret
```

### 3. Service Tokens

Each service has its own Vault token with limited permissions:

- **Core Service**: Can read `secret/data/core-service`
- **API Gateway**: Can read `secret/data/api-gateway`
- **Provisioning Service**: Can read `secret/data/provisioning-service`
- **Tenant Runtime**: Can read `secret/data/tenant-runtime`
- **Dashboard**: Can read `secret/data/dashboard`

## Secret Management

### 1. Adding New Secrets

```bash
# Add a new secret
curl -X POST \
  -H "X-Vault-Token: masterfabric-root-token" \
  -d '{"data": {"NEW_SECRET": "new-value"}}' \
  http://localhost:8200/v1/secret/data/core-service
```

### 2. Updating Secrets

```bash
# Update existing secret
curl -X POST \
  -H "X-Vault-Token: masterfabric-root-token" \
  -d '{"data": {"JWT_SECRET": "new-jwt-secret"}}' \
  http://localhost:8200/v1/secret/data/core-service
```

### 3. Rotating Secrets

```bash
# Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 32)

# Update in Vault
curl -X POST \
  -H "X-Vault-Token: masterfabric-root-token" \
  -d "{\"data\": {\"JWT_SECRET\": \"$NEW_JWT_SECRET\"}}" \
  http://localhost:8200/v1/secret/data/core-service

# Restart services to pick up new secret
docker-compose restart core-service tenant-runtime
```

## Advanced Configuration

### 1. Auto-unseal (Production)

For production, configure auto-unseal to avoid manual unsealing:

```hcl
# vault.hcl
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
}
```

### 2. High Availability

For HA setup, use Consul or integrated storage:

```hcl
# vault.hcl
storage "consul" {
  address = "consul:8500"
  path    = "vault/"
  service_tags = "vault"
  service_address = "vault"
}
```

### 3. Audit Logging

Enable comprehensive audit logging:

```hcl
# vault.hcl
audit {
  enabled = true
  path = "file"
  file_path = "/vault/logs/audit.log"
  format = "json"
  log_raw = true
}
```

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Check Vault health
curl http://localhost:8200/v1/sys/health

# Check seal status
curl -H "X-Vault-Token: masterfabric-root-token" \
  http://localhost:8200/v1/sys/seal-status
```

### 2. Backup Strategy

```bash
# Backup Vault data
docker-compose exec vault vault operator raft snapshot save /vault/backup/snapshot-$(date +%Y%m%d).snap

# Backup configuration
tar -czf vault-config-$(date +%Y%m%d).tar.gz vault/config vault/certs
```

### 3. Monitoring Script

```bash
#!/bin/bash
# vault-monitor.sh

VAULT_ADDR="http://localhost:8200"
ALERT_EMAIL="admin@your-domain.com"

# Check if Vault is sealed
SEAL_STATUS=$(curl -s "$VAULT_ADDR/v1/sys/seal-status" | jq -r '.sealed')

if [ "$SEAL_STATUS" = "true" ]; then
    echo "Vault is sealed!" | mail -s "Vault Alert" "$ALERT_EMAIL"
fi

# Check token expiration
TOKEN_INFO=$(curl -s -H "X-Vault-Token: masterfabric-root-token" \
  "$VAULT_ADDR/v1/auth/token/lookup-self" | jq -r '.data.ttl')

if [ "$TOKEN_INFO" -lt 3600 ]; then
    echo "Root token expires in less than 1 hour!" | mail -s "Vault Token Alert" "$ALERT_EMAIL"
fi
```

## Security Best Practices

### 1. Token Management

- Use short-lived tokens when possible
- Implement token renewal automation
- Monitor token usage and expiration
- Use service-specific tokens with minimal permissions

### 2. Network Security

- Use TLS for all Vault communication
- Restrict network access to Vault
- Use internal Docker networks
- Implement proper firewall rules

### 3. Access Control

- Use least privilege principle
- Regular policy review
- Implement audit logging
- Monitor access patterns

### 4. Backup and Recovery

- Regular automated backups
- Test restore procedures
- Store backups securely
- Document recovery processes

## Troubleshooting

### Common Issues

#### Vault is Sealed

```bash
# Check seal status
docker-compose exec vault vault status

# Unseal with required keys
docker-compose exec vault vault operator unseal <key>
```

#### Service Can't Access Secrets

```bash
# Check token validity
curl -H "X-Vault-Token: <token>" \
  http://localhost:8200/v1/auth/token/lookup-self

# Check policy permissions
curl -H "X-Vault-Token: masterfabric-root-token" \
  http://localhost:8200/v1/sys/policies/acl/core-service-policy
```

#### Connection Issues

```bash
# Check Vault connectivity
docker-compose exec core-service curl -f http://vault:8200/v1/sys/health

# Check network connectivity
docker-compose exec core-service ping vault
```

## Migration from Environment Variables

### 1. Migrate Existing Secrets

```bash
# Use the migration script
./scripts/migrate-secrets-to-vault.sh
```

### 2. Update Service Configuration

Services automatically fall back to environment variables if Vault is unavailable, ensuring smooth migration.

### 3. Remove Environment Variables

Once Vault is confirmed working, remove sensitive environment variables from `.env.local`:

```env
# Remove these after Vault migration
# DATABASE_URL=...
# JWT_SECRET=...
# CLOUDFLARE_API_TOKEN=...
```

## Next Steps

- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)
- [CI/CD Setup Guide](CI_CD_SETUP.md)
- [Monitoring Setup](MONITORING_SETUP.md)
