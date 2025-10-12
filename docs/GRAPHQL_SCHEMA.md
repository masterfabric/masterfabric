# GraphQL Schema Documentation

## Endpoint
`http://localhost:3002/graphql`

## Playground
Access interactive playground at: `http://localhost:3002/graphql`

---

## Types

### User
```graphql
type User {
  id: ID!
  email: String!
  role: String!
  invitedBy: String
  createdAt: DateTime!
  updatedAt: DateTime
}
```

### Organization
```graphql
type Organization {
  id: ID!
  name: String!
  slug: String!
  status: String!
  postgresHost: String
  postgresPort: Int
  postgresDb: String
  postgresUser: String
  postgresUpdatedAt: DateTime
  redisHost: String
  redisPort: Int
  redisUpdatedAt: DateTime
  systemSettings: SystemSettings
}
```

### SystemSettings
```graphql
type SystemSettings {
  id: ID!
  apiGatewayUrl: String!
  apiGatewayStatus: String!
  provisioningUrl: String!
  provisioningStatus: String!
  tenantRuntimeUrl: String!
  tenantRuntimeStatus: String!
  defaultDbHost: String!
  defaultDbPort: Int!
  defaultRedisHost: String!
  defaultRedisPort: Int!
  healthCheckInterval: Int!
  healthCheckEnabled: Boolean!
  notifyOnServiceDown: Boolean!
  notifyOnHighLatency: Boolean!
  latencyThresholdMs: Int!
}
```

### AuthResponse
```graphql
type AuthResponse {
  token: String!
  user: UserResponse!
  organization: OrganizationResponse
}
```

### ServiceHealth
```graphql
type HealthStatus {
  service: String!
  status: String!
  message: String!
  timestamp: String!
  responseTime: Int
}

type SystemHealth {
  overall: String!
  services: [HealthStatus!]!
  timestamp: String!
}
```

### ConnectionTestResult
```graphql
type ConnectionTestResult {
  success: Boolean!
  message: String!
  error: String
  responseTime: Int
}
```

### DeleteResult
```graphql
type DeleteResult {
  success: Boolean!
  message: String!
}
```

---

## Queries

### myOrganization
Get the current user's organization with all details.

```graphql
query MyOrganization {
  myOrganization {
    id
    name
    slug
    status
    postgresHost
    postgresPort
    postgresDb
    postgresUser
    postgresUpdatedAt
    redisHost
    redisPort
    redisUpdatedAt
    systemSettings {
      healthCheckInterval
      healthCheckEnabled
      apiGatewayUrl
      apiGatewayStatus
      provisioningUrl
      provisioningStatus
      tenantRuntimeUrl
      tenantRuntimeStatus
    }
  }
}
```

**Authorization**: Required (Bearer token)  
**Role**: Any authenticated user

---

### organizationStatus
Check the provisioning status of an organization.

```graphql
query OrganizationStatus {
  organizationStatus(id: "organization-id") {
    status
    message
  }
}
```

**Arguments**:
- `id` (ID!): Organization ID

**Authorization**: Required (Bearer token)  
**Role**: Any authenticated user (can only check own organization)

---

### organizationUsers
Get all users in the current user's organization.

```graphql
query GetUsers {
  organizationUsers {
    id
    email
    role
    createdAt
    invitedBy
  }
}
```

**Authorization**: Required (Bearer token)  
**Role**: OWNER, CUSTOMER, DEVELOPER

---

### systemHealth
Get health status of all microservices.

```graphql
query SystemHealthCheck {
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

**Authorization**: Not required  
**Role**: Public

**Response**:
- `overall`: "healthy" | "unhealthy"
- `services`: Array of individual service statuses

---

### testPostgresConnection
Test PostgreSQL connection for current organization.

```graphql
query TestPostgres {
  testPostgresConnection {
    success
    message
    error
    responseTime
  }
}
```

**Authorization**: Required (Bearer token)  
**Role**: OWNER, CUSTOMER, DEVELOPER

---

### testRedisConnection
Test Redis connection for current organization.

```graphql
query TestRedis {
  testRedisConnection {
    success
    message
    error
    responseTime
  }
}
```

**Authorization**: Required (Bearer token)  
**Role**: OWNER, CUSTOMER, DEVELOPER

---

## Mutations

### register
Register a new organization and user.

```graphql
mutation Register {
  register(input: {
    email: "admin@example.com"
    password: "secure-password"
    organizationName: "My Organization"
    organizationSlug: "my-org"
  }) {
    token
    user {
      id
      email
      role
      organizationId
    }
    organization {
      id
      name
      slug
      status
    }
  }
}
```

**Arguments**:
- `input.email` (String!): User email
- `input.password` (String!): User password (min 6 chars)
- `input.organizationName` (String!): Organization display name
- `input.organizationSlug` (String!): Organization slug (lowercase, alphanumeric, hyphens)

**Authorization**: Not required  
**Role**: Public

---

### login
Authenticate a user and get access token.

```graphql
mutation Login {
  login(
    email: "admin@example.com"
    password: "secure-password"
  ) {
    token
    user {
      id
      email
      role
      organizationId
    }
  }
}
```

**Arguments**:
- `email` (String!): User email
- `password` (String!): User password

**Authorization**: Not required  
**Role**: Public

---

### inviteDeveloper
Invite a new developer to the organization.

```graphql
mutation InviteDev {
  inviteDeveloper(input: {
    email: "developer@example.com"
    password: "dev-password"
  }) {
    id
    email
    role
    createdAt
  }
}
```

**Arguments**:
- `input.email` (String!): Developer email
- `input.password` (String!): Developer password (min 6 chars)

**Authorization**: Required (Bearer token)  
**Role**: OWNER, CUSTOMER

---

### deleteUser
Delete a user from the organization.

```graphql
mutation DeleteUser {
  deleteUser(id: "user-id") {
    success
    message
  }
}
```

**Arguments**:
- `id` (ID!): User ID to delete

**Authorization**: Required (Bearer token)  
**Role**: OWNER, CUSTOMER

**Restrictions**:
- Cannot delete yourself
- Cannot delete other OWNER/CUSTOMER users
- Can only delete DEVELOPER users

---

### updatePostgresConnection
Update PostgreSQL connection settings for the organization.

```graphql
mutation UpdatePostgres {
  updatePostgresConnection(input: {
    postgresHost: "localhost"
    postgresPort: 5432
    postgresDb: "mydb"
    postgresUser: "postgres"
    postgresPassword: "password"
  }) {
    id
    postgresHost
    postgresPort
    postgresDb
    postgresUser
    postgresUpdatedAt
  }
}
```

**Arguments**:
- `input.postgresHost` (String): Database host
- `input.postgresPort` (Int): Database port (1-65535)
- `input.postgresDb` (String): Database name
- `input.postgresUser` (String): Database user
- `input.postgresPassword` (String): Database password (optional)

**Authorization**: Required (Bearer token)  
**Role**: OWNER

---

### updateRedisConnection
Update Redis connection settings for the organization.

```graphql
mutation UpdateRedis {
  updateRedisConnection(input: {
    redisHost: "localhost"
    redisPort: 6379
    redisPassword: "password"
  }) {
    id
    redisHost
    redisPort
    redisUpdatedAt
  }
}
```

**Arguments**:
- `input.redisHost` (String): Redis host
- `input.redisPort` (Int): Redis port (1-65535)
- `input.redisPassword` (String): Redis password (optional)

**Authorization**: Required (Bearer token)  
**Role**: OWNER

---

### createProject
Create a new project in the organization.

```graphql
mutation CreateProject {
  createProject(input: {
    name: "My Project"
    description: "Project description"
  }) {
    id
    name
    description
    createdAt
  }
}
```

**Arguments**:
- `input.name` (String!): Project name
- `input.description` (String): Project description (optional)

**Authorization**: Required (Bearer token)  
**Role**: OWNER, CUSTOMER, DEVELOPER

---

### deleteProject
Delete a project from the organization.

```graphql
mutation DeleteProject {
  deleteProject(id: "project-id") {
    id
    name
    status
  }
}
```

**Arguments**:
- `id` (ID!): Project ID to delete

**Authorization**: Required (Bearer token)  
**Role**: OWNER, CUSTOMER

---

## Authentication

### Using Token in Headers
All authenticated requests require a Bearer token in the Authorization header:

```http
POST /graphql
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "query": "query { myOrganization { id name } }"
}
```

### In GraphQL Playground
Add headers in the bottom-left panel:

```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Error Handling

### GraphQL Errors
Errors are returned in standard GraphQL format:

```json
{
  "errors": [
    {
      "message": "Unauthorized: Cannot access other organizations",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

### Common Error Codes
- `UNAUTHENTICATED`: Missing or invalid token
- `FORBIDDEN`: Insufficient permissions
- `BAD_USER_INPUT`: Invalid input data
- `INTERNAL_SERVER_ERROR`: Server error

---

## Role-Based Access Control

### Roles
- **OWNER**: Full access (first user in organization)
- **CUSTOMER**: Can manage users and projects
- **DEVELOPER**: Can view and create projects

### Permission Matrix

| Action | OWNER | CUSTOMER | DEVELOPER |
|--------|-------|----------|-----------|
| View organization | ✅ | ✅ | ✅ |
| Update connections | ✅ | ❌ | ❌ |
| Invite developers | ✅ | ✅ | ❌ |
| Delete users | ✅ | ✅* | ❌ |
| Create projects | ✅ | ✅ | ✅ |
| Delete projects | ✅ | ✅ | ❌ |

*CUSTOMER can only delete DEVELOPER users

---

## Best Practices

### Query Only What You Need
GraphQL allows precise field selection:

```graphql
# Good - only needed fields
query {
  myOrganization {
    id
    name
  }
}

# Avoid - unnecessary fields
query {
  myOrganization {
    id
    name
    slug
    status
    postgresHost
    postgresPort
    # ... all fields
  }
}
```

### Use Variables
For dynamic values, use variables:

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
  }
}
```

Variables:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### Error Handling
Always check for errors:

```typescript
const { data, error } = await client.query({ 
  query: MY_QUERY 
});

if (error) {
  console.error('GraphQL Error:', error.message);
}
```

---

**Last Updated**: October 12, 2025  
**Schema Version**: 1.0 (Phase 1 Complete)  
**Next**: Phase 2 will add Federation support

