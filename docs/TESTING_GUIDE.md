# Testing Guide - GraphQL Migration

## Prerequisites
1. API Gateway running on port 3002
2. Dashboard running on port 3000
3. PostgreSQL database accessible
4. Valid test credentials

## 1. GraphQL Playground Testing

### Access Playground
Open: `http://localhost:3002/graphql`

### Test Register Mutation
```graphql
mutation Register {
  register(input: {
    email: "test@example.com"
    password: "password123"
    organizationName: "Test Org"
    organizationSlug: "test-org"
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

### Test Login Mutation
```graphql
mutation Login {
  login(
    email: "test@example.com"
    password: "password123"
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

### Test Organization Query (requires auth)
```graphql
query MyOrganization {
  myOrganization {
    id
    name
    slug
    status
    postgresHost
    postgresPort
    redisHost
    redisPort
    systemSettings {
      healthCheckInterval
      healthCheckEnabled
    }
  }
}
```

**Headers**:
```json
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

### Test Users Query (requires auth)
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

### Test Invite Developer (requires auth, OWNER role)
```graphql
mutation InviteDev {
  inviteDeveloper(input: {
    email: "developer@example.com"
    password: "devpass123"
  }) {
    id
    email
    role
    createdAt
  }
}
```

### Test Delete User (requires auth, OWNER role)
```graphql
mutation DeleteUser {
  deleteUser(id: "USER_ID_HERE") {
    success
    message
  }
}
```

### Test Health Check
```graphql
query SystemHealthCheck {
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

### Test Connection Management (requires auth)
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
    postgresUpdatedAt
  }
}

query TestPostgres {
  testPostgresConnection {
    success
    message
    error
    responseTime
  }
}

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

query TestRedis {
  testRedisConnection {
    success
    message
    error
    responseTime
  }
}
```

## 2. Dashboard Testing

### Test Login Page
1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Sign in"
4. Should redirect to `/dashboard`
5. Check browser console for no errors
6. Verify token stored in localStorage

### Test Register Page
1. Navigate to `http://localhost:3000/register`
2. Fill in form:
   - Email: `newuser@example.com`
   - Password: `password123`
   - Organization Name: `New Organization`
   - Organization Slug: `new-org`
3. Click "Create account"
4. Should redirect to dashboard or show provisioning status
5. Check browser console for no errors

### Test Settings Page - Users Tab
1. Login as OWNER
2. Navigate to `/dashboard/settings`
3. Click "Users" tab
4. Should see list of users
5. Test "Invite Developer":
   - Enter email and password
   - Click "Invite Developer"
   - Should see success message
   - User list should refresh
6. Test "Delete User":
   - Click delete on a developer user
   - Confirm deletion
   - User list should refresh

### Test Settings Page - Connections Tab
1. Navigate to `/dashboard/settings`
2. Click "Connections" tab
3. Test PostgreSQL connection:
   - Click "Check Status"
   - Should show connection result
   - Click "Update Connection"
   - Modify settings
   - Click "Update"
   - Should show success
4. Test Redis connection:
   - Same process as PostgreSQL

### Test Health Status Indicator
1. On dashboard, look at top-right corner
2. Should see green/orange/red dot
3. Hover over dot - should show tooltip
4. Click dot - should open popup with service details
5. Services should show status and response times
6. Click "Check Again" - should refresh statuses

## 3. Browser DevTools Testing

### Network Tab
1. Open DevTools → Network tab
2. Filter by "graphql"
3. Perform actions in dashboard
4. Verify all requests go to `/graphql`
5. Verify NO requests go to `/api/*`
6. Check request payloads are GraphQL format
7. Check response structure

### Console Tab
1. Open DevTools → Console
2. Should see no errors
3. Perform various actions
4. Verify no REST endpoint errors

### Application Tab
1. Open DevTools → Application → Local Storage
2. Verify `token` is stored
3. Verify `user` object is stored
4. Check token format is JWT

## 4. Error Handling Testing

### Test Invalid Credentials
1. Try login with wrong password
2. Should show error message
3. No console errors

### Test Unauthorized Access
1. Remove token from localStorage
2. Try accessing `/dashboard/settings`
3. Should redirect to login

### Test Invalid GraphQL Query
```graphql
query InvalidQuery {
  nonExistentField
}
```
Should return GraphQL error with helpful message

### Test Network Failure
1. Stop API Gateway
2. Try to login
3. Should show appropriate error message
4. Start API Gateway
5. Click "Check Again" - should reconnect

## 5. Performance Testing

### Check Response Times
1. Open DevTools → Network
2. Perform various actions
3. Check GraphQL request times
4. Should be < 200ms for most queries
5. Mutations should be < 500ms

### Check Payload Sizes
1. Compare GraphQL request sizes vs old REST
2. Should be smaller due to precise field selection

## 6. Regression Testing

### Verify All Features Still Work
- [ ] Login/Logout
- [ ] Registration
- [ ] Dashboard navigation
- [ ] Projects list
- [ ] Projects creation
- [ ] Settings access (OWNER only)
- [ ] User management
- [ ] Connection management
- [ ] Health monitoring
- [ ] Role-based access control

## 7. Integration Testing

### Test Full User Flow
1. Register new organization
2. Login
3. View dashboard
4. Create project
5. Invite developer
6. Check health status
7. Update connections
8. Logout
9. Login as developer
10. Verify limited access

## Common Issues & Solutions

### Issue: "Cannot query field X"
**Solution**: Schema not updated. Restart API Gateway.

### Issue: "Unauthorized"
**Solution**: Token expired or invalid. Re-login.

### Issue: "Network error"
**Solution**: API Gateway not running. Check `npm start`.

### Issue: "EADDRINUSE"
**Solution**: Port 3002 in use. Kill process: `lsof -ti:3002 | xargs kill -9`

## Success Criteria

All tests pass when:
- ✅ No REST endpoints used (except `/health`)
- ✅ All GraphQL queries/mutations work
- ✅ No console errors
- ✅ Proper error messages shown
- ✅ Token authentication works
- ✅ Role-based access control works
- ✅ UI responsive and functional
- ✅ Health monitoring works
- ✅ Connection management works

---

**Last Updated**: October 12, 2025  
**Phase**: Phase 1 Complete  
**Next**: Begin Phase 2 testing after Federation implementation

