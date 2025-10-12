# CI/CD Setup Guide

This guide covers setting up Continuous Integration and Continuous Deployment for MasterFabric using GitHub Actions and Azure DevOps.

## Overview

The CI/CD pipeline includes:

- **Build**: Docker image building and pushing
- **Test**: Unit tests, integration tests, and security scans
- **Deploy**: Automated deployment to development and production
- **Monitor**: Health checks and notifications

## GitHub Actions Setup

### 1. Repository Secrets

Configure the following secrets in your GitHub repository:

#### Required Secrets

```bash
# Development Environment
DEV_HOST=your-dev-server.com
DEV_USERNAME=deploy
DEV_SSH_KEY=your-private-ssh-key

# Production Environment
PROD_HOST=your-prod-server.com
PROD_USERNAME=deploy
PROD_SSH_KEY=your-private-ssh-key

# Container Registry
GITHUB_TOKEN=auto-generated

# Notifications
SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

#### Azure DevOps Secrets

```bash
# Azure Container Registry
dockerRegistryServiceConnection=your-acr-connection
azureServiceConnection=your-azure-connection

# Azure Resources
resourceGroupName=masterfabric-rg
location=eastus

# Environment Variables
databaseUrl=postgresql://user:pass@host:5432/db
redisHost=your-redis-host
jwtSecret=your-jwt-secret
cloudflareApiToken=your-token
apiGatewayUrl=https://api.your-domain.com
tenantRuntimeUrl=https://tenant.your-domain.com
```

### 2. Environment Setup

Create environments in GitHub:

1. Go to **Settings** → **Environments**
2. Create environments:
   - `development`
   - `production`
3. Configure protection rules for production
4. Add required secrets to each environment

### 3. Workflow Files

The following workflow files are already created:

- `.github/workflows/build-and-push.yml` - Build and push Docker images
- `.github/workflows/deploy-dev.yml` - Deploy to development
- `.github/workflows/deploy-prod.yml` - Deploy to production
- `.github/workflows/test.yml` - Run tests and security scans

## Azure DevOps Setup

### 1. Service Connections

Create service connections in Azure DevOps:

#### Azure Container Registry

1. Go to **Project Settings** → **Service connections**
2. Create new connection: **Docker Registry**
3. Configure:
   - Registry type: Azure Container Registry
   - Subscription: Your Azure subscription
   - Azure container registry: Your ACR instance

#### Azure Resource Manager

1. Create new connection: **Azure Resource Manager**
2. Configure:
   - Connection name: `azureServiceConnection`
   - Subscription: Your Azure subscription
   - Resource group: Your resource group

### 2. Variable Groups

Create variable groups for different environments:

#### Development Variables

```yaml
# Variable Group: dev-variables
databaseUrl: "postgresql://user:pass@dev-db:5432/masterfabric"
redisHost: "dev-redis"
jwtSecret: "dev-jwt-secret"
apiGatewayUrl: "https://dev-api.your-domain.com"
tenantRuntimeUrl: "https://dev-tenant.your-domain.com"
```

#### Production Variables

```yaml
# Variable Group: prod-variables
databaseUrl: "postgresql://user:pass@prod-db:5432/masterfabric"
redisHost: "prod-redis"
jwtSecret: "prod-jwt-secret"
apiGatewayUrl: "https://api.your-domain.com"
tenantRuntimeUrl: "https://tenant.your-domain.com"
```

### 3. Pipeline Configuration

The pipeline file `azure-pipelines/azure-pipelines.yml` is already configured with:

- Multi-stage pipeline (Build → Test → Deploy)
- Matrix strategy for multiple services
- Service connections and variable groups
- Azure Container Instances deployment

## Deployment Strategies

### 1. Development Deployment

Development deployments are triggered on push to `develop` branch:

```yaml
# Automatic deployment
on:
  push:
    branches: [ develop ]

# Manual deployment
on:
  workflow_dispatch:
```

Features:
- Automatic deployment on push
- Health checks after deployment
- Slack notifications
- Rollback capability

### 2. Production Deployment

Production deployments require manual approval:

```yaml
# Manual deployment only
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'production'
        type: choice
        options:
        - production
        - staging
```

Features:
- Manual trigger with environment selection
- Database backup before deployment
- Rolling updates
- Comprehensive health checks
- Rollback capability

### 3. Blue-Green Deployment

For zero-downtime deployments:

```bash
# Blue-Green deployment script
#!/bin/bash

# Deploy to green environment
docker-compose -f docker-compose.yml -f docker-compose.green.yml up -d

# Health check green environment
./scripts/health-check.sh green

# Switch traffic to green
./scripts/switch-traffic.sh green

# Keep blue as backup
# docker-compose -f docker-compose.yml -f docker-compose.blue.yml down
```

## Testing Strategy

### 1. Unit Tests

Each service runs unit tests:

```yaml
- name: Run tests
  run: |
    cd services/${{ matrix.service }}
    npm run test
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    REDIS_HOST: localhost
    REDIS_PORT: 6379
    JWT_SECRET: test-secret
```

### 2. Integration Tests

End-to-end testing with real services:

```yaml
- name: Run integration tests
  run: |
    # Start services for integration testing
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    
    # Wait for services to be ready
    timeout 300 bash -c 'until curl -f http://localhost:3002/health; do sleep 5; done'
    
    # Run integration tests
    npm run test:integration
```

### 3. Security Scanning

Automated security scanning:

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

## Monitoring and Notifications

### 1. Slack Integration

Configure Slack notifications for:

- Deployment success/failure
- Test failures
- Security alerts
- Performance issues

```yaml
- name: Notify deployment status
  uses: 8398a7/action-slack@v3
  if: always()
  with:
    status: ${{ job.status }}
    channel: '#deployments'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. Health Checks

Comprehensive health checks after deployment:

```bash
# Health check script
#!/bin/bash

SERVICES=(
  "https://api.your-domain.com/health"
  "https://your-domain.com"
)

for service in "${SERVICES[@]}"; do
  if ! curl -f -s "$service" > /dev/null; then
    echo "❌ Service $service is down!"
    exit 1
  else
    echo "✅ Service $service is healthy"
  fi
done
```

### 3. Performance Monitoring

Monitor deployment performance:

```yaml
- name: Performance test
  run: |
    # Run load tests
    npm run test:load
    
    # Check response times
    curl -w "@curl-format.txt" -o /dev/null -s https://api.your-domain.com/health
```

## Rollback Strategy

### 1. Automatic Rollback

Configure automatic rollback on health check failure:

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    # Restore previous version
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    
    # Notify rollback
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"🚨 Production rollback executed!"}' \
      ${{ secrets.SLACK_WEBHOOK }}
```

### 2. Manual Rollback

Quick rollback script:

```bash
#!/bin/bash
# rollback.sh

PREVIOUS_TAG=$1
if [ -z "$PREVIOUS_TAG" ]; then
  echo "Usage: ./rollback.sh <previous-tag>"
  exit 1
fi

# Update docker-compose to use previous tag
sed -i "s/:latest/:$PREVIOUS_TAG/g" docker-compose.prod.yml

# Deploy previous version
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "✅ Rolled back to version $PREVIOUS_TAG"
```

## Best Practices

### 1. Branch Strategy

```bash
# Feature branches
feature/user-authentication
feature/api-gateway

# Development branch
develop

# Production branch
main
```

### 2. Tagging Strategy

```bash
# Semantic versioning
v1.0.0  # Major release
v1.1.0  # Minor release
v1.1.1  # Patch release

# Environment tags
dev-latest
staging-latest
prod-latest
```

### 3. Environment Promotion

```bash
# Promote through environments
develop → staging → production

# Automated promotion
git tag v1.1.0
git push origin v1.1.0
# Triggers production deployment
```

### 4. Database Migrations

```yaml
- name: Run database migrations
  run: |
    docker-compose exec core-service npx prisma migrate deploy
```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Check build logs
docker-compose logs build

# Test build locally
docker build -t test-image ./services/core-service
```

#### Deployment Failures

```bash
# Check deployment logs
docker-compose logs

# Verify service health
curl -f http://localhost:3002/health
```

#### Test Failures

```bash
# Run tests locally
npm run test

# Check test database
docker-compose exec postgres_core psql -U postgres -c "\l"
```

### Debug Mode

Enable debug logging:

```yaml
env:
  DEBUG: "*"
  LOG_LEVEL: debug
```

## Security Considerations

### 1. Secret Management

- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Use least privilege principle
- Monitor secret usage

### 2. Access Control

- Limit deployment permissions
- Use service accounts
- Implement approval workflows
- Audit deployment actions

### 3. Image Security

- Scan images for vulnerabilities
- Use minimal base images
- Regular security updates
- Sign images with cosign

## Next Steps

- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)
- [Vault Setup Guide](VAULT_SETUP.md)
- [Monitoring Setup](MONITORING_SETUP.md)
