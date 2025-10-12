# System Settings & Configuration Guide

## Overview
MasterFabric now includes comprehensive system settings and microservice configuration management. All settings are automatically configured during organization registration and are fully manageable through the Settings dashboard.

## 🎯 Features

### 1. **Automatic Configuration**
- ✅ Default system settings created automatically on first registration
- ✅ Microservice URLs pre-configured
- ✅ Database and Redis defaults set
- ✅ Health check system enabled by default

### 2. **Database Schema**

#### SystemSettings Model
Stores all system-wide configuration for each organization:

```prisma
model SystemSettings {
  id                    String        @id @default(uuid())
  organizationId        String        @unique
  
  // Microservice Settings
  apiGatewayUrl         String        @default("http://localhost:3002")
  apiGatewayStatus      ServiceStatus @default(ACTIVE)
  provisioningUrl       String        @default("http://localhost:3003")
  provisioningStatus    ServiceStatus @default(ACTIVE)
  tenantRuntimeUrl      String        @default("http://localhost:3004")
  tenantRuntimeStatus   ServiceStatus @default(ACTIVE)
  
  // Data & Database Settings
  defaultDbHost         String        @default("localhost")
  defaultDbPort         Int           @default(5432)
  defaultRedisHost      String        @default("localhost")
  defaultRedisPort      Int           @default(6379)
  
  // Health Check Settings
  healthCheckInterval   Int           @default(10)  // in seconds
  healthCheckEnabled    Boolean       @default(true)
  
  // Notifications
  notifyOnServiceDown   Boolean       @default(true)
  notifyOnHighLatency   Boolean       @default(true)
  latencyThresholdMs    Int           @default(300)
}
```

#### SystemNotification Model
Future-ready notification system:

```prisma
model SystemNotification {
  id              String   @id @default(uuid())
  organizationId  String
  type            String   // 'warning', 'error', 'info'
  title           String
  message         String
  isRead          Boolean  @default(false)
  metadata        Json?
}
```

### 3. **Settings Dashboard**

#### Access
- **Location**: `/dashboard/settings`
- **Permission**: OWNER role only
- **Tabs**: Users, Security, **Database & Microservices**

#### Database & Microservices Tab

**Sections:**

1. **Initial Setup Banner**
   - Shows if `systemSettings` doesn't exist yet
   - Informs users about automatic setup
   - Appears only for new organizations

2. **Microservices Configuration**
   - Displays all 3 microservices
   - Shows status (ACTIVE/INACTIVE/MAINTENANCE)
   - Shows URLs
   - Read-only (contact support to modify)

3. **Health Check Settings**
   - Current check interval
   - Enable/disable status
   - Latency threshold
   - Notification settings
   - **Network Performance Notice**: VPN/proxy warning

4. **PostgreSQL Connection**
   - Host, Port, Database, User
   - Auto-configured during provisioning
   - Falls back to system default if not set

5. **Redis Connection**
   - Host and Port
   - Used for caching and real-time features

### 4. **Default Values**

When a user registers:

```typescript
SystemSettings created with:
├─ API Gateway: http://localhost:3002 (ACTIVE)
├─ Provisioning: http://localhost:3003 (ACTIVE)
├─ Tenant Runtime: http://localhost:3004 (ACTIVE)
├─ DB Host: localhost:5432
├─ Redis Host: localhost:6379
├─ Health Check: 10s interval, ENABLED
└─ Notifications: ON for service down & high latency
```

### 5. **Environment Variables**

Override defaults with environment variables:

```bash
# Microservice URLs
API_GATEWAY_URL=http://api-gateway:3002
PROVISIONING_SERVICE_URL=http://provisioning:3003
TENANT_RUNTIME_URL=http://tenant-runtime:3004

# Database Defaults
DEFAULT_DB_HOST=postgres
DEFAULT_DB_PORT=5432
DEFAULT_REDIS_HOST=redis
DEFAULT_REDIS_PORT=6379
```

### 6. **Integration with Health Check System**

System Settings work seamlessly with the health check system:

- ✅ Health check interval based on settings
- ✅ Latency threshold from settings
- ✅ Notification preferences respected
- ✅ Adaptive polling adjusts automatically
- ✅ VPN/connection warnings displayed

## 📋 User Journey

### First-Time User
1. **Register** → Organization + User + SystemSettings created
2. **Login** → Redirected to dashboard
3. **Navigate to Settings** → See "Initial Setup Required" banner
4. **Create First Project** → Database/Redis configured
5. **Return to Settings** → All values populated

### Existing User
1. **Login** → Dashboard with health status indicator
2. **Settings** → Full microservice & DB configuration visible
3. **View Health Status** → Adaptive based on network performance
4. **Get VPN Warning** → If high latency detected

## 🎨 UI/UX Features

### Info Banners
- **Blue**: Initial setup information
- **Orange**: VPN/network performance warnings
- **Status Badges**: Green (ACTIVE), Gray (NOT_SET)

### Read-Only Fields
All configuration fields are disabled (read-only) to prevent accidental changes. This ensures:
- System stability
- Consistent microservice communication
- Controlled changes through support/admin

### Network Performance Notice
```
⚠️ Network Performance Notice
Health checks adapt automatically based on your network performance.
If you're using VPN, proxy, or experiencing high latency, the system
will adjust check intervals accordingly.
```

## 🔧 Technical Implementation

### 1. Registration Flow
```typescript
auth.service.ts → register()
  ├─ Create Organization
  ├─ Create SystemSettings (with defaults)
  └─ Create User (OWNER)
```

### 2. Settings API
```typescript
organizations.service.ts → findByOrganizationId()
  └─ include: { systemSettings: true }
```

### 3. Frontend Display
```typescript
settings/page.tsx
  ├─ Check if systemSettings exists
  ├─ Show banner if not
  ├─ Display microservice cards
  ├─ Show health check settings
  └─ Display VPN warning
```

## 🚀 Future Enhancements

- [ ] Editable settings for OWNER role
- [ ] SystemNotification implementation
- [ ] Real-time notification system
- [ ] Microservice status override
- [ ] Custom health check intervals per service
- [ ] Email notifications for service down
- [ ] Slack/Discord integration
- [ ] Historical uptime tracking

## 📊 Migration

Migration created: `20251011180701_add_system_settings_and_notifications`

To apply:
```bash
cd services/api-gateway
npx prisma migrate deploy
```

To reset and reapply:
```bash
npx prisma migrate reset
```

## 🔍 Troubleshooting

### Settings Not Showing
**Issue**: SystemSettings is null
**Solution**: Register a new user or manually create:
```sql
INSERT INTO system_settings (organization_id, ...) VALUES (...);
```

### Wrong Microservice URLs
**Issue**: Shows localhost instead of container names
**Solution**: Set environment variables in docker-compose.yml

### Health Check Not Working
**Issue**: Services not being monitored
**Solution**: Check `healthCheckEnabled` in systemSettings

## 📝 Notes

- All settings are organization-scoped
- First user in organization becomes OWNER
- SystemSettings created in transaction with Organization
- Default values suitable for local development
- Production should use environment variables
- Settings are read-only by design for stability

## 🎯 Summary

✅ **Database**: SystemSettings & SystemNotification models added
✅ **Backend**: Auto-creation on registration, include in API responses
✅ **Frontend**: Complete Settings UI with microservice config
✅ **Integration**: Works with health check system
✅ **UX**: Informative banners, status badges, network warnings
✅ **Documentation**: Complete guide for users and developers

