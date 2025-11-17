'use client';

// Force dynamic rendering to prevent static generation issues with Apollo Client
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SchemaTestDrawer } from '@/components/SchemaTestDrawer';
import { 
  GET_PROJECT, 
  GET_PROJECT_API_KEYS, 
  CREATE_API_KEY, 
  DELETE_API_KEY,
  GET_TENANT_USERS,
  REGISTER_TENANT_USER,
  DELETE_TENANT_USER,
  GET_PROJECT_SCHEMAS,
  CREATE_PROJECT_SCHEMA,
  UPDATE_PROJECT_SCHEMA,
  DELETE_PROJECT_SCHEMA,
  GENERATE_PROJECT_JWT_SECRET
} from '@/lib/graphql';

interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  tenantDbUri?: string;
  redisUri?: string;
  authEnabled?: boolean;
  allowSignup?: boolean;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface TenantUser {
  id: string;
  email: string;
  provider: string;
  emailConfirmed: boolean;
  lastSignInAt?: string;
  createdAt: string;
}

interface ProjectSchema {
  id: string;
  tableName: string;
  displayName?: string;
  fields: any;
  enableRLS: boolean;
  enableRealtime: boolean;
  requireAuth?: boolean;
  rateLimit?: number;
  queryCount?: number;
  lastQueryAt?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'overview' | 'api-keys' | 'tenant-users' | 'schemas' | 'auth-settings';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // API Keys state
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Tenant Users state
  const [showCreateTenantUser, setShowCreateTenantUser] = useState(false);
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantPassword, setNewTenantPassword] = useState('');
  const [creatingTenantUser, setCreatingTenantUser] = useState(false);

  // Schemas state
  const [showCreateSchema, setShowCreateSchema] = useState(false);
  const [showEditSchema, setShowEditSchema] = useState(false);
  const [editingSchema, setEditingSchema] = useState<ProjectSchema | null>(null);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newSchemaFields, setNewSchemaFields] = useState<Array<{name: string; type: string}>>([{name: '', type: 'string'}]);
  const [newSchemaRequireAuth, setNewSchemaRequireAuth] = useState(true);
  const [newSchemaRateLimit, setNewSchemaRateLimit] = useState<number | undefined>(undefined);
  const [creatingSchema, setCreatingSchema] = useState(false);
  const [updatingSchema, setUpdatingSchema] = useState(false);
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<ProjectSchema | null>(null);

  const { data: projectData, loading: projectLoading, refetch: refetchProject } = useQuery(GET_PROJECT, {
    variables: { id: projectId },
    skip: !projectId,
  });

  const { data: apiKeysData, loading: apiKeysLoading, refetch: refetchApiKeys } = useQuery(GET_PROJECT_API_KEYS, {
    variables: { projectId },
    skip: !projectId,
  });

  const { data: tenantUsersData, loading: tenantUsersLoading, refetch: refetchTenantUsers } = useQuery(GET_TENANT_USERS, {
    variables: { projectId },
    skip: !projectId,
  });

  const { data: schemasData, loading: schemasLoading, refetch: refetchSchemas } = useQuery(GET_PROJECT_SCHEMAS, {
    variables: { projectId },
    skip: !projectId,
  });

  const [createApiKey] = useMutation(CREATE_API_KEY);
  const [deleteApiKey] = useMutation(DELETE_API_KEY);
  const [registerTenantUser] = useMutation(REGISTER_TENANT_USER);
  const [deleteTenantUser] = useMutation(DELETE_TENANT_USER);
  const [createProjectSchema] = useMutation(CREATE_PROJECT_SCHEMA);
  const [updateProjectSchema] = useMutation(UPDATE_PROJECT_SCHEMA);
  const [deleteProjectSchema] = useMutation(DELETE_PROJECT_SCHEMA);
  const [generateJwtSecret] = useMutation(GENERATE_PROJECT_JWT_SECRET);

  const project = projectData?.project;
  const apiKeys = apiKeysData?.projectApiKeys || [];
  const tenantUsers = tenantUsersData?.tenantUsersForProject || [];
  const schemas = schemasData?.projectSchemas || [];
  const loading = projectLoading;

  // API Key handlers
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreatingKey(true);
    try {
      const result = await createApiKey({
        variables: { projectId, name: newKeyName },
      });

      if (result.data?.createApiKey) {
        setNewlyCreatedKey(result.data.createApiKey.key);
        setNewKeyName('');
        setShowCreateKey(false);
        refetchApiKeys();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;

    setDeletingKeyId(keyId);
    try {
      await deleteApiKey({ variables: { id: keyId } });
      refetchApiKeys();
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      alert(`Failed to delete API key: ${error.message}`);
    } finally {
      setDeletingKeyId(null);
    }
  };

  // Tenant User handlers
  const handleCreateTenantUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantEmail.trim() || !newTenantPassword.trim()) return;

    setCreatingTenantUser(true);
    try {
      await registerTenantUser({
        variables: {
          projectId,
          input: {
            email: newTenantEmail,
            password: newTenantPassword,
          },
        },
      });

      setNewTenantEmail('');
      setNewTenantPassword('');
      setShowCreateTenantUser(false);
      refetchTenantUsers();
      alert('Tenant user created successfully!');
    } catch (error: any) {
      console.error('Error creating tenant user:', error);
      alert(`Failed to create tenant user: ${error.message}`);
    } finally {
      setCreatingTenantUser(false);
    }
  };

  const handleDeleteTenantUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this tenant user?')) return;

    try {
      await deleteTenantUser({ variables: { projectId, userId } });
      refetchTenantUsers();
    } catch (error: any) {
      console.error('Error deleting tenant user:', error);
      alert(`Failed to delete tenant user: ${error.message}`);
    }
  };

  // Schema handlers
  const handleCreateSchema = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate table name format (lowercase, letters, numbers, underscores only, must start with letter)
    const tableNameRegex = /^[a-z][a-z0-9_]*$/;
    if (!newSchemaName.trim()) {
      alert('Table name is required');
      return;
    }
    if (!tableNameRegex.test(newSchemaName.trim())) {
      alert('Table name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores');
      return;
    }
    
    // Validate fields
    const validFields = newSchemaFields.filter(f => f.name.trim());
    if (validFields.length === 0) {
      alert('At least one field is required');
      return;
    }
    
    // Validate field names
    const fieldNameRegex = /^[a-z][a-z0-9_]*$/i;
    for (const field of validFields) {
      if (!field.name.trim()) {
        alert('All fields must have a name');
        return;
      }
      if (!fieldNameRegex.test(field.name.trim())) {
        alert(`Field name "${field.name}" is invalid. Must start with a letter and contain only letters, numbers, and underscores`);
        return;
      }
    }

    setCreatingSchema(true);
    try {
      await createProjectSchema({
        variables: {
          projectId,
          input: {
            tableName: newSchemaName.trim().toLowerCase(),
            displayName: newSchemaName.trim(),
            fields: validFields.map(f => ({ 
              name: f.name.trim().toLowerCase(), 
              type: f.type, 
              required: false 
            })),
          },
        },
      });

      setNewSchemaName('');
      setNewSchemaFields([{name: '', type: 'string'}]);
      setShowCreateSchema(false);
      refetchSchemas();
      alert('Schema created successfully!');
    } catch (error: any) {
      console.error('Error creating schema:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Extract detailed error message
      let errorMessage = 'Failed to create schema';
      
      // Check for GraphQL errors first
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const gqlError = error.graphQLErrors[0];
        errorMessage = gqlError.message || errorMessage;
        if (gqlError.extensions) {
          console.error('GraphQL error extensions:', gqlError.extensions);
        }
      } 
      // Check for network errors
      else if (error.networkError) {
        console.error('Network error:', error.networkError);
        if (error.networkError.result && error.networkError.result.errors) {
          errorMessage = error.networkError.result.errors[0]?.message || errorMessage;
        } else if (error.networkError.message) {
          errorMessage = `Network error: ${error.networkError.message}`;
        } else {
          errorMessage = 'Network error: Please check your connection';
        }
      } 
      // Fallback to error message
      else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Failed to create schema: ${errorMessage}`);
    } finally {
      setCreatingSchema(false);
    }
  };

  const handleUpdateSchema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchema) return;

    setUpdatingSchema(true);
    try {
      await updateProjectSchema({
        variables: {
          projectId,
          schemaId: editingSchema.id,
          input: {
            displayName: editingSchema.displayName,
            requireAuth: editingSchema.requireAuth,
            rateLimit: editingSchema.rateLimit || null,
            enableRLS: editingSchema.enableRLS,
            enableRealtime: editingSchema.enableRealtime,
          },
        },
      });

      setShowEditSchema(false);
      setEditingSchema(null);
      refetchSchemas();
      alert('Schema updated successfully!');
    } catch (error: any) {
      console.error('Error updating schema:', error);
      alert(`Failed to update schema: ${error.message}`);
    } finally {
      setUpdatingSchema(false);
    }
  };

  const handleDeleteSchema = async (schemaId: string) => {
    if (!window.confirm('Are you sure you want to delete this schema? This will also delete the table and all its data.')) return;

    try {
      await deleteProjectSchema({ variables: { projectId, schemaId } });
      refetchSchemas();
    } catch (error: any) {
      console.error('Error deleting schema:', error);
      alert(`Failed to delete schema: ${error.message}`);
    }
  };

  const handleGenerateJwtSecret = async () => {
    if (!window.confirm('Generate a new JWT secret? This will invalidate all existing user tokens.')) return;

    try {
      await generateJwtSecret({ variables: { projectId } });
      refetchProject();
      alert('JWT secret generated successfully!');
    } catch (error: any) {
      console.error('Error generating JWT secret:', error);
      alert(`Failed to generate JWT secret: ${error.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Project not found.</p>
        <Button onClick={() => router.push('/dashboard/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/projects')}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            ← Back to Projects
          </Button>
          <h1 className="text-4xl font-light text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-2">{project.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'api-keys', label: 'API Keys' },
            { id: 'tenant-users', label: 'Tenant Users' },
            { id: 'schemas', label: 'Schemas' },
            { id: 'auth-settings', label: 'Auth Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Basic information about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Project ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">{project.id}</code>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(project.id)}>
                  Copy
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="mt-1 text-sm">{new Date(project.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="mt-1 text-sm">{new Date(project.updatedAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for external GraphQL access</CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateKey ? (
                <Button onClick={() => setShowCreateKey(true)}>Create New API Key</Button>
              ) : (
                <form onSubmit={handleCreateApiKey} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Key Name</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="production-api"
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={creatingKey}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={creatingKey}>
                      {creatingKey ? 'Creating...' : 'Create Key'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowCreateKey(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {newlyCreatedKey && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    ⚠️ Save this key now - it won't be shown again!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded text-sm break-all">
                      {newlyCreatedKey}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(newlyCreatedKey)}>
                      Copy
                    </Button>
                  </div>
                  <Button size="sm" className="mt-2" onClick={() => setNewlyCreatedKey(null)}>
                    Done
                  </Button>
                </div>
              )}

              <div className="mt-6 space-y-4">
                {apiKeys.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No API keys yet</p>
                ) : (
                  apiKeys.map((key: ApiKey) => (
                    <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(key.createdAt).toLocaleDateString()}
                        </p>
                        {key.lastUsedAt && (
                          <p className="text-sm text-muted-foreground">
                            Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteApiKey(key.id)}
                        disabled={deletingKeyId === key.id}
                      >
                        {deletingKeyId === key.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'tenant-users' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Users</CardTitle>
              <CardDescription>End users of your application (like Supabase auth.users)</CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateTenantUser ? (
                <Button onClick={() => setShowCreateTenantUser(true)}>Add Tenant User</Button>
              ) : (
                <form onSubmit={handleCreateTenantUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={newTenantEmail}
                      onChange={(e) => setNewTenantEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={creatingTenantUser}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <input
                      type="password"
                      value={newTenantPassword}
                      onChange={(e) => setNewTenantPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={creatingTenantUser}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={creatingTenantUser}>
                      {creatingTenantUser ? 'Creating...' : 'Create User'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowCreateTenantUser(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-6 space-y-4">
                {tenantUsersLoading ? (
                  <p className="text-muted-foreground text-sm">Loading users...</p>
                ) : tenantUsers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No tenant users yet</p>
                ) : (
                  tenantUsers.map((user: TenantUser) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>Provider: {user.provider}</span>
                          <span>Confirmed: {user.emailConfirmed ? '✓' : '✗'}</span>
                          {user.lastSignInAt && (
                            <span>Last sign in: {new Date(user.lastSignInAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTenantUser(user.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'schemas' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schemas</CardTitle>
              <CardDescription>Define custom tables/collections for your project</CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateSchema ? (
                <Button onClick={() => setShowCreateSchema(true)}>Create New Schema</Button>
              ) : (
                <form onSubmit={handleCreateSchema} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Table Name</label>
                    <input
                      type="text"
                      value={newSchemaName}
                      onChange={(e) => setNewSchemaName(e.target.value)}
                      placeholder="users, posts, etc."
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={creatingSchema}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Fields</label>
                    {newSchemaFields.map((field, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const updated = [...newSchemaFields];
                            updated[idx].name = e.target.value;
                            setNewSchemaFields(updated);
                          }}
                          placeholder="Field name"
                          className="flex-1 px-3 py-2 border rounded-md"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const updated = [...newSchemaFields];
                            updated[idx].type = e.target.value;
                            setNewSchemaFields(updated);
                          }}
                          className="px-3 py-2 border rounded-md"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="json">JSON</option>
                        </select>
                        {newSchemaFields.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setNewSchemaFields(newSchemaFields.filter((_, i) => i !== idx))}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewSchemaFields([...newSchemaFields, {name: '', type: 'string'}])}
                    >
                      + Add Field
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={creatingSchema}>
                      {creatingSchema ? 'Creating...' : 'Create Schema'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowCreateSchema(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-6 space-y-4">
                {schemasLoading ? (
                  <p className="text-muted-foreground text-sm">Loading schemas...</p>
                ) : schemas.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No schemas yet</p>
                ) : (
                  schemas.map((schema: ProjectSchema) => (
                    <div key={schema.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{schema.displayName || schema.tableName}</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{schema.tableName}</code>
                          </div>
                          <div className="mt-2 space-y-1">
                            {schema.fields.map((field: any, idx: number) => (
                              <div key={idx} className="text-sm text-muted-foreground">
                                <code>{field.name}</code>: {field.type}
                                {field.required && ' (required)'}
                                {field.unique && ' (unique)'}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                            <span>RLS: {schema.enableRLS ? '✓' : '✗'}</span>
                            <span>Realtime: {schema.enableRealtime ? '✓' : '✗'}</span>
                            <span>Auth: {schema.requireAuth !== false ? '✓' : '✗'}</span>
                            {schema.rateLimit && <span>Rate Limit: {schema.rateLimit}/min</span>}
                            {schema.queryCount !== undefined && <span>Queries: {schema.queryCount}</span>}
                            {schema.lastQueryAt && <span>Last Query: {new Date(schema.lastQueryAt).toLocaleString()}</span>}
                            <span>Updated: {new Date(schema.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSchema(schema);
                              setShowEditSchema(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSchema(schema);
                              setTestDrawerOpen(true);
                            }}
                          >
                            Test
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSchema(schema.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Schema Modal */}
          {showEditSchema && editingSchema && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Edit Schema: {editingSchema.displayName || editingSchema.tableName}</CardTitle>
                <CardDescription>Update schema settings and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateSchema} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Display Name</label>
                    <input
                      type="text"
                      value={editingSchema.displayName || ''}
                      onChange={(e) => setEditingSchema({ ...editingSchema, displayName: e.target.value })}
                      placeholder="Schema display name"
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={updatingSchema}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireAuth"
                      checked={editingSchema.requireAuth !== false}
                      onChange={(e) => setEditingSchema({ ...editingSchema, requireAuth: e.target.checked })}
                      className="w-4 h-4"
                      disabled={updatingSchema}
                    />
                    <label htmlFor="requireAuth" className="text-sm font-medium">
                      Require Authentication
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Rate Limit (queries per minute)</label>
                    <input
                      type="number"
                      value={editingSchema.rateLimit || ''}
                      onChange={(e) => setEditingSchema({ 
                        ...editingSchema, 
                        rateLimit: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      placeholder="Leave empty for no limit"
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={updatingSchema}
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum number of queries allowed per minute. Leave empty for unlimited.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableRLS"
                      checked={editingSchema.enableRLS}
                      onChange={(e) => setEditingSchema({ ...editingSchema, enableRLS: e.target.checked })}
                      className="w-4 h-4"
                      disabled={updatingSchema}
                    />
                    <label htmlFor="enableRLS" className="text-sm font-medium">
                      Enable Row Level Security (RLS)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableRealtime"
                      checked={editingSchema.enableRealtime}
                      onChange={(e) => setEditingSchema({ ...editingSchema, enableRealtime: e.target.checked })}
                      className="w-4 h-4"
                      disabled={updatingSchema}
                    />
                    <label htmlFor="enableRealtime" className="text-sm font-medium">
                      Enable Realtime
                    </label>
                  </div>

                  {editingSchema.queryCount !== undefined && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Statistics</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Total Queries: {editingSchema.queryCount}</p>
                        {editingSchema.lastQueryAt && (
                          <p>Last Query: {new Date(editingSchema.lastQueryAt).toLocaleString()}</p>
                        )}
                        <p>Last Updated: {new Date(editingSchema.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={updatingSchema}>
                      {updatingSchema ? 'Updating...' : 'Update Schema'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowEditSchema(false);
                        setEditingSchema(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'auth-settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Settings</CardTitle>
              <CardDescription>Configure authentication for tenant users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Auth Enabled</label>
                <p className="mt-1 text-sm">{project.authEnabled ? 'Yes' : 'No'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Allow Signup</label>
                <p className="mt-1 text-sm">{project.allowSignup ? 'Yes' : 'No'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">JWT Expiration</label>
                <p className="mt-1 text-sm">{project.jwtExpiresIn || '7d'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">JWT Secret</label>
                {project.jwtSecret ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">••••••••••••••••</code>
                    <Button variant="outline" size="sm" onClick={handleGenerateJwtSecret}>
                      Regenerate
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleGenerateJwtSecret}>
                    Generate JWT Secret
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Used to sign tenant user JWT tokens
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schema Test Drawer */}
      {selectedSchema && (
        <SchemaTestDrawer
          isOpen={testDrawerOpen}
          onClose={() => {
            setTestDrawerOpen(false);
            setSelectedSchema(null);
          }}
          projectId={projectId}
          schema={selectedSchema}
        />
      )}
    </div>
  );
}
