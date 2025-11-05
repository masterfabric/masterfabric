'use client';

// Force dynamic rendering to prevent static generation issues with Apollo Client
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { ConnectionManager } from '@/components/ConnectionManager';
import { 
  GET_ORGANIZATION_USERS, 
  GET_MY_ORGANIZATION,
  INVITE_DEVELOPER, 
  DELETE_USER,
  DELETE_ORGANIZATION 
} from '@/lib/graphql';

interface User {
  id: string;
  email: string;
  role: 'OWNER' | 'CUSTOMER' | 'DEVELOPER';
  invitedBy?: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  postgresHost?: string;
  postgresPort?: number;
  postgresDb?: string;
  postgresUser?: string;
  postgresPassword?: string;
  postgresUpdatedAt?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  redisUpdatedAt?: string;
  features?: {
    allowDeveloperRole?: boolean;
  };
  systemSettings?: SystemSettings;
}

interface SystemSettings {
  id: string;
  apiGatewayUrl: string;
  apiGatewayStatus: string;
  provisioningUrl: string;
  provisioningStatus: string;
  tenantRuntimeUrl: string;
  tenantRuntimeStatus: string;
  defaultDbHost: string;
  defaultDbPort: number;
  defaultRedisHost: string;
  defaultRedisPort: number;
  healthCheckInterval: number;
  healthCheckEnabled: boolean;
  notifyOnServiceDown: boolean;
  notifyOnHighLatency: boolean;
  latencyThresholdMs: number;
}

type Tab = 'general' | 'users' | 'security' | 'database' | 'connections';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmOrgName, setConfirmOrgName] = useState('');
  const router = useRouter();

  // GraphQL queries
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useQuery(GET_ORGANIZATION_USERS);
  const { data: orgData, loading: orgLoading, refetch: refetchOrganization } = useQuery(GET_MY_ORGANIZATION);

  const [inviteDeveloper, { loading: inviting, data: inviteData, error: inviteError }] = useMutation(INVITE_DEVELOPER);
  const [deleteUser, { data: deleteData, error: deleteError }] = useMutation(DELETE_USER);
  const [deleteOrganization, { loading: deletingOrg }] = useMutation(DELETE_ORGANIZATION);

  // Handle successful invite
  useEffect(() => {
    if (inviteData?.inviteDeveloper) {
      setInviteEmail('');
      setInvitePassword('');
      refetchUsers();
      alert('Developer invited successfully!');
    }
  }, [inviteData, refetchUsers]);

  // Handle invite errors
  useEffect(() => {
    if (inviteError) {
      alert(`Failed to invite developer: ${inviteError.message}`);
    }
  }, [inviteError]);

  // Handle successful delete
  useEffect(() => {
    if (deleteData?.deleteUser) {
      refetchUsers();
      alert('User deleted successfully!');
    }
  }, [deleteData, refetchUsers]);

  // Handle delete errors
  useEffect(() => {
    if (deleteError) {
      alert(`Failed to delete user: ${deleteError.message}`);
    }
  }, [deleteError]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/dashboard/login');
      return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);

    // Only OWNER can access settings
    if (user.role !== 'OWNER') {
      alert('Access denied. Only organization owners can access settings.');
      router.push('/dashboard');
      return;
    }
  }, [router]);


  const handleInviteDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !invitePassword) return;

    try {
      await inviteDeveloper({
        variables: {
          input: {
            email: inviteEmail,
            password: invitePassword,
          },
        },
      });
    } catch (error) {
      // Error handled by useEffect
    }
  };

  const handleDeleteOrganization = async () => {
    if (confirmOrgName !== organization?.name) {
      return; // Button will be disabled anyway
    }

    try {
      await deleteOrganization({
        variables: {
          id: organization?.id,
        },
      });
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Close dialog and redirect
      setShowDeleteDialog(false);
      router.push('/dashboard/login');
    } catch (error: any) {
      alert(`Failed to delete organization: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteUser({
        variables: { id: userId },
      });
    } catch (error) {
      // Error handled by useEffect
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800';
      case 'CUSTOMER':
        return 'bg-blue-100 text-blue-800';
      case 'DEVELOPER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const users = usersData?.organizationUsers || [];
  const organization = orgData?.myOrganization || null;
  const loading = usersLoading || orgLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-light text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your organization settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-foreground/10">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-3 text-sm transition-colors ${
              activeTab === 'general'
                ? 'border-b-2 border-foreground text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-foreground text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 text-sm transition-colors ${
              activeTab === 'security'
                ? 'border-b-2 border-foreground text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 text-sm transition-colors ${
              activeTab === 'database'
                ? 'border-b-2 border-foreground text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Database & Microservices
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`pb-3 text-sm transition-colors ${
              activeTab === 'connections'
                ? 'border-b-2 border-foreground text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Connections
          </button>
        </div>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Organization Name</Label>
                <Input value={organization?.name || ''} disabled className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Slug</Label>
                <Input value={organization?.slug || ''} disabled className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Input value={organization?.status || ''} disabled className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription className="text-red-600/80">
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start justify-between p-4 border border-red-200 bg-white rounded-md">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Delete Organization</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this organization and all associated data. This action cannot be undone.
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                      <li>All projects will be deleted</li>
                      <li>All users will lose access</li>
                      <li>All database connections will be removed</li>
                      <li>All API keys will be invalidated</li>
                    </ul>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="ml-4 bg-red-600 hover:bg-red-700"
                  >
                    Delete Organization
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Invite Developer */}
          <Card>
            <CardHeader>
              <CardTitle>Invite Developer</CardTitle>
              <CardDescription>Add a new developer to your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteDeveloper} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="developer@example.com"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={inviting} className="bg-foreground text-background">
                  {inviting ? 'Inviting...' : 'Invite Developer'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Users</CardTitle>
              <CardDescription>Manage users in your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-foreground/10"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-foreground">{user.email}</p>
                        <span className={`px-2 py-1 text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {user.role !== 'OWNER' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Control organization features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-foreground/10">
                  <div>
                    <p className="font-medium text-foreground">Allow Developer Role</p>
                    <p className="text-sm text-muted-foreground">
                      Enable inviting developers to your organization
                    </p>
                  </div>
                  <div className="text-sm">
                    {organization?.features?.allowDeveloperRole ? (
                      <span className="text-green-600 font-medium">Enabled</span>
                    ) : (
                      <span className="text-red-600 font-medium">Disabled</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database Tab */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Info Banner */}
          {!organization?.systemSettings && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-500/30">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                Initial Setup Required
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                System settings will be automatically configured when you create your first project. 
                Default microservice URLs and database connections will be set up for you.
              </p>
            </div>
          )}

          {/* Microservices Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Microservices Configuration</CardTitle>
              <CardDescription>Backend services powering your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border border-foreground/10">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-semibold">API Gateway</Label>
                      <span className={`px-2 py-0.5 text-xs font-medium ${
                        organization?.systemSettings?.apiGatewayStatus === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {organization?.systemSettings?.apiGatewayStatus || 'NOT_SET'}
                      </span>
                    </div>
                    <Input 
                      value={organization?.systemSettings?.apiGatewayUrl || 'http://localhost:3002'} 
                      disabled 
                      className="text-sm"
                    />
                  </div>
                  <div className="p-4 border border-foreground/10">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-semibold">Provisioning Service</Label>
                      <span className={`px-2 py-0.5 text-xs font-medium ${
                        organization?.systemSettings?.provisioningStatus === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {organization?.systemSettings?.provisioningStatus || 'NOT_SET'}
                      </span>
                    </div>
                    <Input 
                      value={organization?.systemSettings?.provisioningUrl || 'http://localhost:3003'} 
                      disabled 
                      className="text-sm"
                    />
                  </div>
                  <div className="p-4 border border-foreground/10">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-semibold">Tenant Runtime</Label>
                      <span className={`px-2 py-0.5 text-xs font-medium ${
                        organization?.systemSettings?.tenantRuntimeStatus === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {organization?.systemSettings?.tenantRuntimeStatus || 'NOT_SET'}
                      </span>
                    </div>
                    <Input 
                      value={organization?.systemSettings?.tenantRuntimeUrl || 'http://localhost:3004'} 
                      disabled 
                      className="text-sm"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Microservices are automatically configured during organization setup. Contact support to modify these settings.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Health Check Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Health Check Settings</CardTitle>
              <CardDescription>Monitor your services automatically</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Health Check Interval</Label>
                    <Input 
                      value={`${organization?.systemSettings?.healthCheckInterval || 10} seconds`} 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label>Health Check Status</Label>
                    <Input 
                      value={organization?.systemSettings?.healthCheckEnabled ? 'Enabled' : 'Disabled'} 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label>Latency Threshold</Label>
                    <Input 
                      value={`${organization?.systemSettings?.latencyThresholdMs || 300}ms`} 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label>Notifications</Label>
                    <Input 
                      value={organization?.systemSettings?.notifyOnServiceDown ? 'Enabled' : 'Disabled'} 
                      disabled 
                    />
                  </div>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-500/30">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">
                    Network Performance Notice
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-300">
                    Health checks adapt automatically based on your network performance. If you're using VPN, proxy, or experiencing high latency, the system will adjust check intervals accordingly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-500/30">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
              Database & Cache Connections
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Configure your PostgreSQL database and Redis cache connections. These settings control where your projects store data and manage real-time features.
              Test connections to ensure services are accessible before deploying your applications.
            </p>
          </div>

          {/* PostgreSQL Connection */}
          <Card>
            <CardHeader>
              <CardTitle>PostgreSQL Connection</CardTitle>
              <CardDescription>Your organization database configuration - Projects connect here</CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectionManager
                type="postgres"
                currentConfig={{
                  host: organization?.postgresHost || organization?.systemSettings?.defaultDbHost,
                  port: organization?.postgresPort || organization?.systemSettings?.defaultDbPort,
                  database: organization?.postgresDb,
                  user: organization?.postgresUser,
                  password: organization?.postgresPassword,
                  updatedAt: organization?.postgresUpdatedAt,
                }}
                onUpdate={refetchOrganization}
              />
            </CardContent>
          </Card>

          {/* Redis Connection */}
          <Card>
            <CardHeader>
              <CardTitle>Redis Connection</CardTitle>
              <CardDescription>Your organization cache configuration - Used for caching and real-time features</CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectionManager
                type="redis"
                currentConfig={{
                  host: organization?.redisHost || organization?.systemSettings?.defaultRedisHost,
                  port: organization?.redisPort || organization?.systemSettings?.defaultRedisPort,
                  password: organization?.redisPassword,
                  updatedAt: organization?.redisUpdatedAt,
                }}
                onUpdate={refetchOrganization}
              />
            </CardContent>
          </Card>

          {/* Future Connections Placeholder */}
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p className="text-sm mb-2">More Connection Types</p>
                <p className="text-xs">Additional database connections, message queues, and external services will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Organization Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => {
        setShowDeleteDialog(false);
        setConfirmOrgName('');
      }}>
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Organization</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-sm text-red-800 font-semibold mb-2">
                ⚠️ This action cannot be undone!
              </p>
              <p className="text-sm text-red-700">
                This will permanently delete <span className="font-semibold">{organization?.name}</span> and all associated data:
              </p>
              <ul className="text-xs text-red-700 mt-2 ml-4 list-disc space-y-1">
                <li>All projects and their data</li>
                <li>All user accounts</li>
                <li>All database connections</li>
                <li>All API keys</li>
              </ul>
            </div>

            <div>
              <Label htmlFor="confirm-org-name" className="text-sm font-medium">
                Type <span className="font-mono font-semibold">{organization?.name}</span> to confirm:
              </Label>
              <Input
                id="confirm-org-name"
                type="text"
                value={confirmOrgName}
                onChange={(e) => setConfirmOrgName(e.target.value)}
                placeholder="Organization name"
                className="mt-1"
                autoComplete="off"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteDialog(false);
              setConfirmOrgName('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteOrganization}
            disabled={confirmOrgName !== organization?.name || deletingOrg}
            className="bg-red-600 hover:bg-red-700"
          >
            {deletingOrg ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

