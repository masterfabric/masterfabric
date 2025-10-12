# Quick Test Guide - Health Check System

## 🚀 Starting the System

### Option 1: Using Docker Compose
```bash
# From project root
docker-compose up --build
```

### Option 2: Using Start Script
```bash
./start-masterfabric.sh
```

## 🧪 Testing Health Checks

### 1. Test Individual Service Health Endpoints

```bash
# Test API Gateway
curl http://localhost:3002/health
# Expected: {"status":"ok","service":"api-gateway","message":"API Gateway is running"}

# Test Provisioning Service
curl http://localhost:3003/health
# Expected: {"status":"ok","service":"provisioning-service","message":"Provisioning Service is running"}

# Test Tenant Runtime
curl http://localhost:3004/health
# Expected: {"status":"ok","service":"tenant-runtime","message":"Tenant Runtime is running"}
```

### 2. Test GraphQL Health Queries

Open GraphQL Playground: `http://localhost:3002/graphql`

#### Query: System Health
```graphql
query {
  systemHealth {
    overall
    timestamp
    services {
      service
      status
      message
      responseTime
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "systemHealth": {
      "overall": "healthy",
      "timestamp": "2025-10-11T...",
      "services": [
        {
          "service": "api-gateway",
          "status": "healthy",
          "message": "API Gateway is running",
          "responseTime": 45
        },
        {
          "service": "provisioning-service",
          "status": "healthy",
          "message": "Provisioning Service is running",
          "responseTime": 38
        },
        {
          "service": "tenant-runtime",
          "status": "healthy",
          "message": "Tenant Runtime is running",
          "responseTime": 42
        }
      ]
    }
  }
}
```

#### Query: Specific Service Health
```graphql
query {
  serviceHealth(serviceName: "api-gateway") {
    service
    status
    message
    timestamp
    responseTime
  }
}
```

### 3. Test Dashboard UI

1. **Access Dashboard**: Open `http://localhost:3000`

2. **Login**: Use your credentials to log in

3. **Check Status Indicator**: 
   - Look at the top-right corner
   - You should see a green pulsing dot with "System Status" label

4. **Open Status Popup**:
   - Click the green dot
   - A dialog should open showing:
     - Overall Status: Healthy
     - All three services with green indicators
     - Response times for each service
     - Last checked timestamp

5. **Test Manual Refresh**:
   - Click "Check Again" button
   - Status should refresh immediately

6. **Close Dialog**:
   - Click "Close" button

### 4. Test Service Failure Scenario

#### Stop a service
```bash
docker-compose stop tenant-runtime
```

**What should happen:**
1. Within 30 seconds (next auto-poll), the status indicator turns red
2. A "Service Connection Lost" dialog automatically appears
3. Clicking the status indicator shows tenant-runtime as "unhealthy"

#### Restart the service
```bash
docker-compose start tenant-runtime
```

**What should happen:**
1. Within 30 seconds, the indicator turns green again
2. The retry dialog can be dismissed
3. All services show as healthy

### 5. Test Error Handling

#### Stop all services except api-gateway
```bash
docker-compose stop provisioning-service tenant-runtime
```

**Expected Behavior:**
- Status indicator: RED
- Overall status: unhealthy
- provisioning-service: status = "unhealthy", message includes error
- tenant-runtime: status = "unhealthy", message includes error
- api-gateway: status = "healthy"

## 📊 Monitoring in Real-Time

### Watch Docker Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway

# Health check related logs
docker-compose logs -f | grep "Health check"
```

### Watch Health Status
```bash
# Continuous health check
watch -n 5 'curl -s http://localhost:3002/health'
```

## 🐛 Troubleshooting

### Status indicator not showing
- Check browser console for errors
- Verify GraphQL endpoint is accessible: `http://localhost:3002/graphql`
- Check if Apollo Client is properly configured

### Services showing as unhealthy
```bash
# Check if services are running
docker-compose ps

# Check service logs
docker-compose logs provisioning-service
docker-compose logs tenant-runtime

# Verify network connectivity
docker network inspect masterfabric_masterfabric-network
```

### Port conflicts
If ports are already in use:
```bash
# Check ports
lsof -i :3002
lsof -i :3003
lsof -i :3004

# Stop conflicting processes or change ports in docker-compose.yml
```

## ✅ Success Checklist

- [ ] All three services start successfully
- [ ] All `/health` endpoints return `{"status":"ok"}`
- [ ] GraphQL `systemHealth` query returns all services as healthy
- [ ] Dashboard shows green status indicator
- [ ] Clicking indicator opens detailed status popup
- [ ] Stopping a service turns indicator red
- [ ] Retry dialog appears automatically
- [ ] Restarting service turns indicator green again
- [ ] Response times are displayed correctly
- [ ] Manual refresh works

## 🎯 Performance Expectations

- **Health Check Response Time**: < 100ms per service
- **GraphQL Query Time**: < 200ms for systemHealth
- **UI Update Latency**: 30 seconds (auto-poll interval)
- **Dialog Open Time**: Instant (< 50ms)

## 📝 Notes

- Health checks run every 30 seconds automatically
- Timeout for each health check: 5 seconds
- Services are checked in parallel, not sequentially
- Failed health checks don't crash the system
- Historical data is not stored (future enhancement)

## 🔗 Related Documentation

- [HEALTH_CHECK_SYSTEM.md](./HEALTH_CHECK_SYSTEM.md) - Complete system documentation
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation details
- [README.md](./README.md) - Project overview

