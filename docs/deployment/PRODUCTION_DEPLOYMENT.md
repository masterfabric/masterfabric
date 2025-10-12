# Production Deployment Guide

This guide covers deploying MasterFabric to production using Docker Compose with security, monitoring, and high availability considerations.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker Engine 20.10+
- Docker Compose v2.0+
- Minimum 4GB RAM, 2 CPU cores
- SSL certificate (Let's Encrypt recommended)
- Domain name configured

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y nginx certbot python3-certbot-nginx ufw fail2ban
```

### 2. Security Configuration

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Configure fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. SSL Certificate Setup

```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Application Deployment

### 1. Clone and Setup

```bash
# Create application directory
sudo mkdir -p /opt/masterfabric
sudo chown $USER:$USER /opt/masterfabric
cd /opt/masterfabric

# Clone repository
git clone https://github.com/masterfabric/masterfabric.git .

# Create production environment
cp .env.local.example .env.local.prod
```

### 2. Production Environment Configuration

Edit `.env.local.prod`:

```env
# Production Database
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@postgres_core:5432/masterfabric
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_PASSWORD
POSTGRES_DB=masterfabric

# Redis Configuration
REDIS_HOST=redis_cache
REDIS_PORT=6379

# JWT Configuration (Generate strong secret)
JWT_SECRET=GENERATE_STRONG_SECRET_HERE
JWT_EXPIRES_IN=7d

# Service URLs (Internal)
CORE_SERVICE_URL=http://core-service:3005/graphql
PROVISIONING_SERVICE_URL=http://provisioning-service:3003/graphql
TENANT_RUNTIME_URL=http://tenant-runtime:3004/graphql

# API Gateway Configuration
API_GATEWAY_PORT=3002
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=1000
CACHE_TTL=300

# Dashboard Configuration (External)
NEXT_PUBLIC_API_GATEWAY_URL=https://api.your-domain.com/graphql
NEXT_PUBLIC_TENANT_RUNTIME_URL=https://api.your-domain.com/tenant-runtime

# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your-production-token
CLOUDFLARE_ZONE_ID=your-zone-id

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
```

### 3. Deploy with Production Configuration

```bash
# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Database Migration

```bash
# Run database migrations
docker-compose exec core-service npx prisma migrate deploy

# Verify database
docker-compose exec core-service npx prisma studio
```

## Nginx Configuration

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/masterfabric
```

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=dashboard:10m rate=30r/s;

# Upstream services
upstream api_gateway {
    server 127.0.0.1:3002;
    keepalive 32;
}

upstream dashboard {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Main site
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Dashboard
    location / {
        limit_req zone=dashboard burst=20 nodelay;
        proxy_pass http://dashboard;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# API subdomain
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API Gateway
    location / {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://your-domain.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        add_header Access-Control-Expose-Headers "Content-Length,Content-Range" always;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://api_gateway/health;
        access_log off;
    }
}
```

### 2. Enable Configuration

```bash
sudo ln -s /etc/nginx/sites-available/masterfabric /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Logging

### 1. Log Management

```bash
# Create log directory
sudo mkdir -p /var/log/masterfabric
sudo chown $USER:$USER /var/log/masterfabric

# Configure log rotation
sudo nano /etc/logrotate.d/masterfabric
```

```bash
/var/log/masterfabric/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f /opt/masterfabric/docker-compose.yml -f /opt/masterfabric/docker-compose.prod.yml restart
    endscript
}
```

### 2. Health Monitoring

Create a monitoring script:

```bash
nano /opt/masterfabric/scripts/health-check.sh
```

```bash
#!/bin/bash

# Health check script
SERVICES=("https://your-domain.com" "https://api.your-domain.com/health")
ALERT_EMAIL="admin@your-domain.com"

for service in "${SERVICES[@]}"; do
    if ! curl -f -s "$service" > /dev/null; then
        echo "Service $service is down!" | mail -s "MasterFabric Alert" "$ALERT_EMAIL"
        # Restart services
        cd /opt/masterfabric
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart
    fi
done
```

```bash
chmod +x /opt/masterfabric/scripts/health-check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /opt/masterfabric/scripts/health-check.sh
```

### 3. Backup Strategy

```bash
nano /opt/masterfabric/scripts/backup.sh
```

```bash
#!/bin/bash

# Backup script
BACKUP_DIR="/opt/backups/masterfabric"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Database backup
docker-compose exec -T postgres_core pg_dump -U postgres masterfabric > "$BACKUP_DIR/db_$DATE.sql"

# Volume backup
docker run --rm -v masterfabric_postgres_data:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/volumes_$DATE.tar.gz" -C /data .

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

```bash
chmod +x /opt/masterfabric/scripts/backup.sh

# Daily backup at 2 AM
crontab -e
# Add: 0 2 * * * /opt/masterfabric/scripts/backup.sh
```

## Security Considerations

### 1. Environment Variables

- Use strong, unique passwords
- Rotate JWT secrets regularly
- Store sensitive data in Vault (see [Vault Setup Guide](VAULT_SETUP.md))

### 2. Network Security

- Use internal Docker networks
- Expose only necessary ports
- Implement rate limiting
- Use HTTPS everywhere

### 3. Container Security

- Run containers as non-root users
- Use minimal base images
- Regular security updates
- Scan images for vulnerabilities

## Scaling and Performance

### 1. Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  api-gateway:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  core-service:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

### 2. Load Balancing

Update Nginx configuration for multiple instances:

```nginx
upstream api_gateway {
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
    keepalive 32;
}
```

### 3. Database Optimization

```bash
# PostgreSQL tuning
docker-compose exec postgres_core psql -U postgres -c "
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
"
```

## Maintenance

### 1. Updates

```bash
# Update application
cd /opt/masterfabric
git pull origin main
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 2. Monitoring Commands

```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Logs
docker-compose logs -f --tail=100

# Database status
docker-compose exec postgres_core psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

### 3. Troubleshooting

```bash
# Check service health
curl -f https://api.your-domain.com/health

# Check database connection
docker-compose exec core-service npx prisma db pull

# Restart specific service
docker-compose restart api-gateway

# View service logs
docker-compose logs api-gateway
```

## Next Steps

- [Vault Setup Guide](VAULT_SETUP.md) - Secure secrets management
- [CI/CD Setup Guide](CI_CD_SETUP.md) - Automated deployments
- [Monitoring Setup](MONITORING_SETUP.md) - Advanced monitoring
