# Health Check System

## Overview
A comprehensive health monitoring system for MasterFabric services with real-time status updates and GraphQL integration.

## Features

### Backend (API Gateway)
- **GraphQL Health Module**: Complete health check system with GraphQL queries
  - `systemHealth`: Returns overall system status and all service statuses
  - `serviceHealth(serviceName: String!)`: Returns specific service health status
- **HTTP Health Endpoints**: All services expose `/health` endpoints
  - API Gateway: `http://localhost:3002/health`
  - Provisioning Service: `http://localhost:3003/health`
  - Tenant Runtime: `http://localhost:3004/health`

### Frontend (Dashboard)
- **Service Status Indicator**: Green/Red dot in top-right corner
  - Green: All services healthy
  - Red: One or more services down
  - Animated pulse effect when healthy
  - Auto-polling every 30 seconds

- **Status Popup Dialog**: Click the indicator to see detailed status
  - Overall system health
  - Individual service statuses
  - Response times
  - Last check timestamp
  - Manual refresh button

- **Retry Dialog**: Automatic alert when services go down
  - Shows when services transition from healthy to unhealthy
  - Option to retry or dismiss
  - Clean, minimal design matching the app theme

## GraphQL Queries

### System Health Query
```graphql
query SystemHealth {
  systemHealth {
    overall
    timestamp
    services {
      service
      status
      message
      timestamp
      responseTime
    }
  }
}
```

### Service Health Query
```graphql
query ServiceHealth($serviceName: String!) {
  serviceHealth(serviceName: $serviceName) {
    service
    status
    message
    timestamp
    responseTime
  }
}
```

## Components

### Backend Components
- `HealthModule`: Main health check module
- `HealthService`: Service health check logic with NestJS HttpService
- `HealthResolver`: GraphQL resolvers for health queries
- `HealthStatus` & `SystemHealth`: GraphQL entity types

### Frontend Components
- `ServiceStatusIndicator`: Main status indicator with popup
- `Dialog`: Reusable dialog component (can be used throughout the app)
- `health.ts`: TypeScript types and query exports

## Design Principles

### UI/UX
- **Minimalist Design**: Small, unobtrusive indicator
- **No Shadows**: Clean, flat design in light mode [[memory:3603093]]
- **Pure White Backgrounds**: Following design preferences [[memory:3603093]]
- **Color Scheme**: 
  - Dialog buttons: White background, navy blue (blue-800) text and border
  - Primary buttons: Foreground background with transition effects

### Technical
- **NestJS HttpService**: Using @nestjs/axios instead of raw axios
- **GraphQL First**: All health data through GraphQL
- **Polling Strategy**: 30-second intervals for real-time updates
- **Error Handling**: Graceful degradation when services are unavailable

## Installation

### Backend Dependencies
```bash
cd services/api-gateway
npm install @nestjs/axios axios
```

### Build Services
```bash
# From project root
docker-compose up --build
```

## Usage

### Testing Health Endpoints
```bash
# API Gateway
curl http://localhost:3002/health

# Provisioning Service
curl http://localhost:3003/health

# Tenant Runtime
curl http://localhost:3004/health
```

### Testing GraphQL Queries
Visit `http://localhost:3002/graphql` and run:
```graphql
query {
  systemHealth {
    overall
    services {
      service
      status
      message
      responseTime
    }
  }
}
```

## Configuration

### Environment Variables
Set these in your `.env.local` files:
- `API_GATEWAY_URL`: API Gateway base URL (default: http://localhost:3002)
- `PROVISIONING_SERVICE_URL`: Provisioning Service URL (default: http://localhost:3003)
- `TENANT_RUNTIME_URL`: Tenant Runtime URL (default: http://localhost:3004)

### Polling Interval
Modify the `pollInterval` in `ServiceStatusIndicator.tsx`:
```typescript
pollInterval: 30000, // milliseconds
```

## Future Enhancements
- WebSocket/subscription support for real-time updates
- Historical health data tracking
- Alert notifications
- Service uptime statistics
- Detailed error logs in the UI

