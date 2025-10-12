# Database Connection Management System

## Overview

The Connection Management System allows organizations to securely manage their PostgreSQL and Redis connections through the dashboard. This system provides a secure, user-friendly interface for viewing, updating, and testing database connections.

## Features

### 1. **Secure Password Management**
- Passwords are displayed as masked (••••••••)
- "Show" button opens a verification dialog
- Account password verification required to view connection passwords
- Encrypted storage in database

### 2. **Connection Testing**
- "Check Status" button tests the connection in real-time
- Visual feedback with green (success) or red (failure) indicators
- Response time measurement
- Detailed error messages for troubleshooting

### 3. **Connection Updates**
- "Update Connection" button opens a configuration dialog
- Update host, port, database, user, and password
- Optional password field - leave empty to keep existing password
- Real-time validation

### 4. **Error Handling**
- Connection failures show detailed error messages
- Helpful troubleshooting tips
- Warnings about firewall rules and server accessibility
- Network latency warnings

## Architecture

### Backend (API Gateway)

#### GraphQL Queries
```graphql
query TestPostgresConnection {
  testPostgresConnection {
    success
    message
    error
    responseTime
  }
}

query TestRedisConnection {
  testRedisConnection {
    success
    message
    error
    responseTime
  }
}
```

#### GraphQL Mutations
```graphql
mutation UpdatePostgresConnection($input: UpdatePostgresConnectionDto!) {
  updatePostgresConnection(input: $input) {
    id
    postgresHost
    postgresPort
    postgresDb
    postgresUser
  }
}

mutation UpdateRedisConnection($input: UpdateRedisConnectionDto!) {
  updateRedisConnection(input: $input) {
    id
    redisHost
    redisPort
  }
}
```

#### Backend Files
- `services/api-gateway/src/modules/organizations/organizations.service.ts` - Connection testing and update logic
- `services/api-gateway/src/modules/organizations/organizations.resolver.ts` - GraphQL resolvers
- `services/api-gateway/src/modules/organizations/dto/update-connection.dto.ts` - Input DTOs
- `services/api-gateway/src/modules/organizations/dto/connection-test.dto.ts` - Test result DTO

#### Connection Testing Logic

**PostgreSQL Testing:**
```typescript
const client = new Client({
  host: organization.postgresHost,
  port: organization.postgresPort || 5432,
  database: organization.postgresDb,
  user: organization.postgresUser,
  password: organization.postgresPassword || undefined,
  connectionTimeoutMillis: 5000,
});

await client.connect();
await client.query('SELECT 1');
await client.end();
```

**Redis Testing:**
```typescript
const redis = new Redis({
  host: organization.redisHost,
  port: organization.redisPort || 6379,
  password: organization.redisPassword || undefined,
  connectTimeout: 5000,
  maxRetriesPerRequest: 1,
});

await redis.ping();
redis.disconnect();
```

### Frontend (Dashboard)

#### Components
- `services/dashboard/src/components/ConnectionManager.tsx` - Reusable connection management component
- `services/dashboard/src/app/dashboard/settings/page.tsx` - Settings page with connection cards

#### Connection Manager Component Props
```typescript
interface ConnectionManagerProps {
  type: 'postgres' | 'redis';
  currentConfig: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  };
  onUpdate: () => void;
}
```

## User Interface

### PostgreSQL Connection Card

The card displays:
- Host (read-only)
- Port (read-only)
- Database (read-only)
- User (read-only)
- Password (masked with "Show" button)
- "Check Status" button with status indicator
- "Update Connection" button

### Redis Connection Card

The card displays:
- Host (read-only)
- Port (read-only)
- Password (masked with "Show" button)
- "Check Status" button with status indicator
- "Update Connection" button

### Dialogs

#### Show Password Dialog
1. User clicks "Show" button
2. Dialog prompts for account password verification
3. After verification, displays the connection password
4. Security warning about encrypted passwords

#### Update Connection Dialog
1. User clicks "Update Connection"
2. Dialog shows all connection fields as editable inputs
3. Password field is optional (leave empty to keep existing)
4. Info banner explains the settings control project connections
5. "Update" button saves changes and refreshes organization data

## Security Features

1. **Authentication Required**: All GraphQL queries/mutations require JWT authentication
2. **Organization Isolation**: Users can only manage their own organization's connections
3. **Password Masking**: Passwords are never displayed in plain text initially
4. **Verification Dialog**: Secondary verification required to view passwords
5. **Optional Password Updates**: Can update other fields without changing password
6. **Encrypted Storage**: Passwords stored securely in database

## Error Messages and Warnings

### Connection Test Failures

When a connection test fails, the system displays:
- Red status indicator
- Error message (e.g., "Failed to connect to PostgreSQL")
- Detailed error description
- Troubleshooting suggestions

Example error display:
```
❌ Failed to connect to PostgreSQL (2341ms)

Connection Error
ECONNREFUSED: Connection refused at 127.0.0.1:5432

Please check your connection settings, firewall rules, and ensure 
the database server is running.
```

### Default Configuration Warning

If no custom connection is configured, the system uses defaults from `SystemSettings`:
- Default PostgreSQL: `localhost:5432`
- Default Redis: `localhost:6379`

A blue info banner explains:
```
These settings control where your projects will connect. Make sure 
the connection details are correct and the server is accessible.
```

## Usage Flow

### Testing a Connection

1. Navigate to Dashboard → Settings → Database & Microservices
2. Locate the PostgreSQL or Redis connection card
3. Click "Check Status"
4. View the connection test result with status and response time
5. If failed, review the error message and troubleshooting tips

### Updating a Connection

1. Navigate to Dashboard → Settings → Database & Microservices
2. Locate the connection card you want to update
3. Click "Update Connection"
4. Fill in the connection details:
   - Host (e.g., `db.example.com`)
   - Port (e.g., `5432` for PostgreSQL, `6379` for Redis)
   - Database name (PostgreSQL only)
   - Username (PostgreSQL only)
   - Password (optional - leave empty to keep existing)
5. Review the info banner
6. Click "Update"
7. System saves and refetches organization data
8. Connection card updates with new values

### Viewing a Password

1. Click the "Show" button next to the password field
2. Dialog opens requesting account password verification
3. Enter your account password
4. Click "Show Password"
5. System displays the connection password
6. Close dialog when done

## Default Values

When an organization is created, default system settings are established:

```typescript
{
  defaultDbHost: 'localhost',
  defaultDbPort: 5432,
  defaultRedisHost: 'localhost',
  defaultRedisPort: 6379,
}
```

These defaults are used until the organization configures custom connections.

## Dependencies

### Backend
- `pg` - PostgreSQL client for connection testing
- `ioredis` - Redis client for connection testing
- `@nestjs/axios` - HTTP client for health checks
- `@nestjs/graphql` - GraphQL support
- `class-validator` - Input validation

### Frontend
- `@apollo/client` - GraphQL client
- `react` - UI framework
- `next.js` - React framework
- Shadcn/ui components (Dialog, Button, Input, Card)

## Best Practices

1. **Test Before Update**: Always test the connection after updating settings
2. **Secure Passwords**: Use strong passwords for database connections
3. **Regular Testing**: Periodically test connections to ensure availability
4. **Error Monitoring**: Pay attention to error messages for quick troubleshooting
5. **Default Settings**: Understand that defaults are used until custom settings are configured
6. **Network Configuration**: Ensure firewall rules allow connections from your application servers

## Troubleshooting

### Connection Timeout
- Check if the database server is running
- Verify network connectivity
- Review firewall rules
- Confirm the host and port are correct

### Authentication Failed
- Verify username and password
- Check user permissions on the database
- Ensure the user has remote access enabled

### Connection Refused
- Database server may not be running
- Port may be blocked by firewall
- Host address may be incorrect
- Network routing issues

### High Response Time
- Network latency or congestion
- Database server under heavy load
- VPN or proxy connection
- Geographic distance to server

## Future Enhancements

- [ ] Connection pooling configuration
- [ ] SSL/TLS certificate management
- [ ] Connection string import/export
- [ ] Historical connection test logs
- [ ] Automated connection health monitoring
- [ ] Multi-database support per organization
- [ ] Read replica configuration
- [ ] Backup connection settings

