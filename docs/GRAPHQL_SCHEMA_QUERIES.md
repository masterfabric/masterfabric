# GraphQL Schema Queries & Mutations Guide

This guide shows you how to query and mutate data in your project schemas using GraphQL.

## 📍 GraphQL Playground URLs

- **API Gateway (Federation)**: http://localhost:3002/graphql
- **Core Service**: http://localhost:3005/graphql
- **Tenant Runtime**: http://localhost:3004/graphql

## 🔐 Authentication

All queries require authentication. Include your JWT token in the headers:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

## 📋 Schema Management (Core Service)

### Query: List All Schemas for a Project

```graphql
query GetProjectSchemas($projectId: String!) {
  projectSchemas(projectId: $projectId) {
    id
    tableName
    displayName
    fields
    enableRLS
    policies
    enableRealtime
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "projectId": "your-project-id"
}
```

### Query: Get a Specific Schema

```graphql
query GetProjectSchema($projectId: String!, $schemaId: String!) {
  projectSchema(projectId: $projectId, schemaId: $schemaId) {
    id
    tableName
    displayName
    fields
    enableRLS
    policies
    enableRealtime
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "projectId": "your-project-id",
  "schemaId": "your-schema-id"
}
```

### Mutation: Create a New Schema

```graphql
mutation CreateProjectSchema($projectId: String!, $input: CreateProjectSchemaInput!) {
  createProjectSchema(projectId: $projectId, input: $input) {
    id
    tableName
    displayName
    fields
    enableRLS
    policies
    enableRealtime
    createdAt
  }
}
```

**Variables:**
```json
{
  "projectId": "your-project-id",
  "input": {
    "tableName": "products",
    "displayName": "Products",
    "fields": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "price",
        "type": "number",
        "required": true
      },
      {
        "name": "description",
        "type": "text",
        "required": false
      }
    ],
    "enableRLS": true,
    "policies": [],
    "enableRealtime": false
  }
}
```

### Mutation: Update Schema

```graphql
mutation UpdateProjectSchema($projectId: String!, $schemaId: String!, $input: UpdateProjectSchemaInput!) {
  updateProjectSchema(projectId: $projectId, schemaId: $schemaId, input: $input) {
    id
    tableName
    displayName
    fields
    updatedAt
  }
}
```

### Mutation: Delete Schema

```graphql
mutation DeleteProjectSchema($projectId: String!, $schemaId: String!) {
  deleteProjectSchema(projectId: $projectId, schemaId: $schemaId) {
    id
    tableName
  }
}
```

## 🗄️ Data Operations (Query & Mutate Schema Data)

Now you can query and mutate data in your schema tables using GraphQL!

### Query: Get Data from a Schema Table

```graphql
query QuerySchemaData($projectId: String!, $input: QuerySchemaDataInput!) {
  querySchemaData(projectId: $projectId, input: $input)
}
```

**Variables:**
```json
{
  "projectId": "your-project-id",
  "input": {
    "tableName": "users",
    "where": {
      "email": "user@example.com"
    },
    "orderBy": {
      "created_at": "desc"
    },
    "limit": 10,
    "offset": 0
  }
}
```

**Example: Get all users**
```graphql
query {
  querySchemaData(
    projectId: "your-project-id"
    input: {
      tableName: "users"
      limit: 100
    }
  )
}
```

### Mutation: Create Data in a Schema Table

```graphql
mutation CreateSchemaData($projectId: String!, $input: CreateSchemaDataInput!) {
  createSchemaData(projectId: $projectId, input: $input)
}
```

**Variables:**
```json
{
  "projectId": "your-project-id",
  "input": {
    "tableName": "users",
    "data": {
      "email": "newuser@example.com",
      "password_hash": "hashed_password_here",
      "first_name": "John",
      "last_name": "Doe",
      "email_verified": false
    }
  }
}
```

**Example: Create a user**
```graphql
mutation {
  createSchemaData(
    projectId: "your-project-id"
    input: {
      tableName: "users"
      data: {
        email: "john@example.com"
        password_hash: "$2b$10$..."
        first_name: "John"
        last_name: "Doe"
      }
    }
  )
}
```

### Mutation: Update Data in a Schema Table

```graphql
mutation UpdateSchemaData($projectId: String!, $input: UpdateSchemaDataInput!) {
  updateSchemaData(projectId: $projectId, input: $input)
}
```

**Variables:**
```json
{
  "projectId": "your-project-id",
  "input": {
    "tableName": "users",
    "id": "user-uuid-here",
    "data": {
      "first_name": "Jane",
      "email_verified": true
    }
  }
}
```

### Mutation: Delete Data from a Schema Table

```graphql
mutation DeleteSchemaData($projectId: String!, $input: DeleteSchemaDataInput!) {
  deleteSchemaData(projectId: $projectId, input: $input)
}
```

**Variables:**
```json
{
  "projectId": "your-project-id",
  "input": {
    "tableName": "users",
    "id": "user-uuid-here"
  }
}
```

## 🧪 Testing in GraphQL Playground

1. **Open GraphQL Playground**: http://localhost:3002/graphql

2. **Set Headers** (bottom left):
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "x-api-key": "core-service-api-key-change-me"
}
```

3. **Run Queries**: Copy and paste the queries above

## 📝 Complete Example: Working with "users" Schema

Since every project automatically gets a "users" schema, here's a complete workflow:

### Step 1: List all schemas
```graphql
query {
  projectSchemas(projectId: "your-project-id") {
    id
    tableName
    displayName
    fields
  }
}
```

### Step 2: Query users data
```graphql
query {
  querySchemaData(
    projectId: "your-project-id"
    input: {
      tableName: "users"
      limit: 10
    }
  )
}
```

### Step 3: Create a new user
```graphql
mutation {
  createSchemaData(
    projectId: "your-project-id"
    input: {
      tableName: "users"
      data: {
        email: "test@example.com"
        password_hash: "$2b$10$hashedpassword"
        first_name: "Test"
        last_name: "User"
      }
    }
  )
}
```

### Step 4: Update user
```graphql
mutation {
  updateSchemaData(
    projectId: "your-project-id"
    input: {
      tableName: "users"
      id: "user-id-from-step-3"
      data: {
        email_verified: true
        last_login: "2025-01-01T00:00:00Z"
      }
    }
  )
}
```

### Step 5: Query with filters
```graphql
query {
  querySchemaData(
    projectId: "your-project-id"
    input: {
      tableName: "users"
      where: {
        email_verified: true
      }
      orderBy: {
        created_at: "desc"
      }
      limit: 5
    }
  )
}
```

## 🔒 Security Notes

- All queries are parameterized to prevent SQL injection
- Field names are validated against schema definitions
- Tenant isolation is enforced (you can only access your project's data)
- Authentication is required for all operations

