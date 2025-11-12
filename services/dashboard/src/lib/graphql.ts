import { ApolloClient, InMemoryCache, createHttpLink, gql, ApolloLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev";

// Load Apollo Client error messages for better debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV !== "production") {
  loadDevMessages();
  loadErrorMessages();
}

// Function to create Apollo Client (for proper Next.js SSR handling)
function createApolloClient() {
  const gatewayHttpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql',
    credentials: 'same-origin',
  });

  // Direct link to core-service for health queries
  const coreHealthHttpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:3005/graphql',
    credentials: 'same-origin',
  });

  const authLink = setContext((_, { headers }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      }
    };
  });

  // Public link for health queries (no auth required)
  const publicHealthLink = from([coreHealthHttpLink]);
  
  // Authenticated link for gateway queries
  const authenticatedGatewayLink = from([authLink, gatewayHttpLink]);

  // Route GetSystemHealth query directly to core-service (public), everything else to gateway (authenticated)
  const splitLink = ApolloLink.split(
    (operation) => {
      // Check if this is a health query by operation name or query string
      const isHealthQuery = 
        operation.operationName === 'GetSystemHealth' ||
        operation.query?.loc?.source?.body?.includes('systemHealth') ||
        false;
      return isHealthQuery;
    },
    publicHealthLink, // No auth for health checks - direct to Core Service
    authenticatedGatewayLink // Auth required for gateway queries
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
    ssrMode: typeof window === 'undefined',
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
        fetchPolicy: 'cache-and-network',
      },
      query: {
        errorPolicy: 'all',
        fetchPolicy: 'network-only',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  });
}

// Create and export the client instance
export const apolloClient = createApolloClient();

// GraphQL Queries and Mutations
export const TENANT_REGISTER = gql`
  mutation TenantRegister($input: TenantRegisterDto!) {
    tenantRegister(input: $input) {
      token
      user {
        id
        email
        organizationId
        createdAt
      }
    }
  }
`;

export const TENANT_LOGIN = gql`
  mutation TenantLogin($input: TenantLoginDto!) {
    tenantLogin(input: $input) {
      token
      user {
        id
        email
        organizationId
        createdAt
      }
    }
  }
`;

export const GET_TENANT_PROJECTS = gql`
  query GetTenantProjects {
    tenantProjects {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_TENANT_PROJECT = gql`
  mutation CreateTenantProject($input: CreateProjectDto!) {
    createTenantProject(input: $input) {
      id
      name
      description
      createdAt
    }
  }
`;

export const UPDATE_TENANT_PROJECT = gql`
  mutation UpdateTenantProject($id: ID!, $input: UpdateProjectDto!) {
    updateTenantProject(id: $id, input: $input) {
      id
      name
      description
      updatedAt
    }
  }
`;

export const DELETE_TENANT_PROJECT = gql`
  mutation DeleteTenantProject($id: ID!) {
    deleteTenantProject(id: $id) {
      id
    }
  }
`;

export const GET_TENANT_PROJECT_SCHEMA = gql`
  query GetTenantProjectSchema($projectId: ID!) {
    tenantProjectSchema(projectId: $projectId) {
      id
      name
      fields {
        name
        type
        required
        defaultValue
      }
      relationships {
        name
        type
        targetModel
        fields
      }
    }
  }
`;

export const UPDATE_TENANT_PROJECT_SCHEMA = gql`
  mutation UpdateTenantProjectSchema($projectId: ID!, $input: UpdateSchemaDto!) {
    updateTenantProjectSchema(projectId: $projectId, input: $input) {
      id
      name
      fields {
        name
        type
        required
        defaultValue
      }
      relationships {
        name
        type
        targetModel
        fields
      }
    }
  }
`;

export const GET_TENANT_RECORDS = gql`
  query GetTenantRecords($projectId: ID!, $modelName: String!, $filters: JSON, $sort: JSON, $limit: Int, $offset: Int) {
    tenantRecords(projectId: $projectId, modelName: $modelName, filters: $filters, sort: $sort, limit: $limit, offset: $offset) {
      data
      total
      hasMore
    }
  }
`;

export const CREATE_TENANT_RECORD = gql`
  mutation CreateTenantRecord($projectId: ID!, $modelName: String!, $data: JSON!) {
    createTenantRecord(projectId: $projectId, modelName: $modelName, data: $data) {
      id
      data
      createdAt
    }
  }
`;

export const UPDATE_TENANT_RECORD = gql`
  mutation UpdateTenantRecord($projectId: ID!, $modelName: String!, $id: ID!, $data: JSON!) {
    updateTenantRecord(projectId: $projectId, modelName: $modelName, id: $id, data: $data) {
      id
      data
      updatedAt
    }
  }
`;

export const DELETE_TENANT_RECORD = gql`
  mutation DeleteTenantRecord($projectId: ID!, $modelName: String!, $id: ID!) {
    deleteTenantRecord(projectId: $projectId, modelName: $modelName, id: $id) {
      id
    }
  }
`;

export const GET_TENANT_API_KEYS = gql`
  query GetTenantApiKeys($projectId: ID!) {
    tenantApiKeys(projectId: $projectId) {
      id
      name
      key
      createdAt
      lastUsedAt
    }
  }
`;

export const CREATE_TENANT_API_KEY = gql`
  mutation CreateTenantApiKey($projectId: ID!, $name: String!) {
    createTenantApiKey(projectId: $projectId, name: $name) {
      id
      name
      key
      createdAt
    }
  }
`;

export const DELETE_TENANT_API_KEY = gql`
  mutation DeleteTenantApiKey($id: ID!) {
    deleteTenantApiKey(id: $id) {
      id
    }
  }
`;

// Platform Management Queries
export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        role
        organizationId
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
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
`;

export const GET_ORGANIZATION_USERS = gql`
  query GetOrganizationUsers {
    organizationUsers {
      id
      email
      role
      createdAt
      updatedAt
    }
  }
`;

export const INVITE_DEVELOPER = gql`
  mutation InviteDeveloper($input: InviteDeveloperInput!) {
    inviteDeveloper(input: $input) {
      id
      email
      role
      createdAt
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

export const GET_MY_ORGANIZATION = gql`
  query GetMyOrganization {
    myOrganization {
      id
      name
      slug
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORGANIZATION_STATUS = gql`
  query GetOrganizationStatus($id: ID!) {
    organizationStatus(id: $id) {
      status
      message
      timestamp
    }
  }
`;

export const GET_ORGANIZATIONS = gql`
  query GetOrganizations {
    organizations {
      id
      name
      slug
      status
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ORGANIZATION = gql`
  mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationDto!) {
    updateOrganization(id: $id, input: $input) {
      id
      name
      slug
      status
      updatedAt
    }
  }
`;

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      description
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectDto!) {
    createProject(input: $input) {
      id
      name
      description
      organizationId
      createdAt
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectDto!) {
    updateProject(id: $id, input: $input) {
      id
      name
      description
      updatedAt
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
      id
    }
  }
`;

export const GET_SYSTEM_HEALTH = gql`
  query GetSystemHealth {
    systemHealth {
      services {
        name
        status
        responseTime
        lastChecked
        message
      }
      overallStatus
      timestamp
    }
  }
`;

export const UPDATE_POSTGRES_CONNECTION = gql`
  mutation UpdatePostgresConnection($input: UpdatePostgresConnectionDto!) {
    updatePostgresConnection(input: $input) {
      id
      name
      postgresHost
      postgresPort
      postgresDatabase
      postgresUsername
      postgresPassword
      updatedAt
    }
  }
`;

export const UPDATE_REDIS_CONNECTION = gql`
  mutation UpdateRedisConnection($input: UpdateRedisConnectionDto!) {
    updateRedisConnection(input: $input) {
      id
      name
      redisHost
      redisPort
      redisPassword
      updatedAt
    }
  }
`;

export const TEST_POSTGRES_CONNECTION = gql`
  query TestPostgresConnection {
    testPostgresConnection {
      success
      message
      error
      responseTime
    }
  }
`;

export const TEST_REDIS_CONNECTION = gql`
  query TestRedisConnection {
    testRedisConnection {
      success
      message
      error
      responseTime
    }
  }
`;

export const DELETE_ORGANIZATION = gql`
  mutation DeleteOrganization($id: ID!) {
    deleteOrganization(id: $id) {
      id
      name
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      organizationId
      tenantDbUri
      redisUri
      createdAt
      updatedAt
    }
  }
`;

export const GET_PROJECT_API_KEYS = gql`
  query GetProjectApiKeys($projectId: ID!) {
    projectApiKeys(projectId: $projectId) {
      id
      name
      key
      createdAt
      lastUsedAt
    }
  }
`;

export const CREATE_API_KEY = gql`
  mutation CreateApiKey($projectId: ID!, $name: String!) {
    createApiKey(projectId: $projectId, name: $name) {
      id
      name
      key
      createdAt
    }
  }
`;

export const DELETE_API_KEY = gql`
  mutation DeleteApiKey($id: ID!) {
    deleteApiKey(id: $id) {
      id
    }
  }
`;

// ==================== TENANT USERS ====================

export const GET_TENANT_USERS = gql`
  query GetTenantUsers($projectId: String!) {
    tenantUsersForProject(projectId: $projectId) {
      id
      email
      provider
      providerId
      emailConfirmed
      lastSignInAt
      metadata
      createdAt
      updatedAt
    }
  }
`;

export const REGISTER_TENANT_USER = gql`
  mutation RegisterTenantUser($projectId: String!, $input: RegisterTenantUserInput!) {
    registerTenantUser(projectId: $projectId, input: $input) {
      access_token
      projectId
      user {
        id
        email
        provider
        emailConfirmed
        createdAt
      }
    }
  }
`;

export const LOGIN_TENANT_USER = gql`
  mutation LoginTenantUser($projectId: String!, $input: LoginTenantUserInput!) {
    loginTenantUser(projectId: $projectId, input: $input) {
      access_token
      projectId
      user {
        id
        email
        provider
        emailConfirmed
        lastSignInAt
      }
    }
  }
`;

export const DELETE_TENANT_USER = gql`
  mutation DeleteTenantUser($projectId: String!, $userId: String!) {
    deleteTenantUser(projectId: $projectId, userId: $userId) {
      id
      email
    }
  }
`;

export const GENERATE_PROJECT_JWT_SECRET = gql`
  mutation GenerateProjectJwtSecret($projectId: String!) {
    generateProjectJwtSecret(projectId: $projectId)
  }
`;

// ==================== PROJECT SCHEMAS ====================

export const GET_PROJECT_SCHEMAS = gql`
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
`;

export const CREATE_PROJECT_SCHEMA = gql`
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
`;

export const UPDATE_PROJECT_SCHEMA = gql`
  mutation UpdateProjectSchema($projectId: String!, $schemaId: String!, $input: UpdateProjectSchemaInput!) {
    updateProjectSchema(projectId: $projectId, schemaId: $schemaId, input: $input) {
      id
      tableName
      displayName
      fields
      enableRLS
      policies
      enableRealtime
      updatedAt
    }
  }
`;

export const DELETE_PROJECT_SCHEMA = gql`
  mutation DeleteProjectSchema($projectId: String!, $schemaId: String!) {
    deleteProjectSchema(projectId: $projectId, schemaId: $schemaId) {
      id
      tableName
    }
  }
`;