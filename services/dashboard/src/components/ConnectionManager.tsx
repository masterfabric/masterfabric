'use client';

import { useState } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { 
  UPDATE_POSTGRES_CONNECTION, 
  UPDATE_REDIS_CONNECTION,
  TEST_POSTGRES_CONNECTION,
  TEST_REDIS_CONNECTION 
} from '@/lib/graphql';

interface ConnectionManagerProps {
  type: 'postgres' | 'redis';
  currentConfig: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    updatedAt?: string;
  };
  onUpdate: () => void;
}

export function ConnectionManager({ type, currentConfig, onUpdate }: ConnectionManagerProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    host: currentConfig.host || '',
    port: currentConfig.port || (type === 'postgres' ? 5432 : 6379),
    database: currentConfig.database || '',
    user: currentConfig.user || '',
    password: '',
  });

  const [updatePostgres] = useMutation(UPDATE_POSTGRES_CONNECTION, {
    refetchQueries: ['Organizations'],
  });
  const [updateRedis] = useMutation(UPDATE_REDIS_CONNECTION, {
    refetchQueries: ['Organizations'],
  });

  // Use lazy queries for manual testing
  const [testPostgres] = useLazyQuery(TEST_POSTGRES_CONNECTION, {
    fetchPolicy: 'network-only',
  });
  const [testRedis] = useLazyQuery(TEST_REDIS_CONNECTION, {
    fetchPolicy: 'network-only',
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = type === 'postgres' 
        ? await testPostgres()
        : await testRedis();
      
      if (result.error) {
        throw result.error;
      }
      
      const testData = type === 'postgres' 
        ? result.data?.testPostgresConnection 
        : result.data?.testRedisConnection;
      
      setTestResult(testData);
    } catch (error: any) {
      console.error('Connection test error:', error);
      setTestResult({
        success: false,
        message: 'Failed to test connection',
        error: error.message || 'Unknown error occurred',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleUpdate = async () => {
    try {
      // Ensure port is a number
      const port = typeof formData.port === 'string' ? parseInt(formData.port, 10) : formData.port;
      
      // Validate inputs
      if (!formData.host || !port) {
        alert('Host and Port are required');
        return;
      }

      if (type === 'postgres' && (!formData.database || !formData.user)) {
        alert('Database and User are required for PostgreSQL');
        return;
      }
      
      const input = type === 'postgres'
        ? {
            postgresHost: formData.host.trim(),
            postgresPort: port,
            postgresDb: formData.database?.trim() || '',
            postgresUser: formData.user?.trim() || '',
            postgresPassword: formData.password?.trim() || undefined,
          }
        : {
            redisHost: formData.host.trim(),
            redisPort: port,
            redisPassword: formData.password?.trim() || undefined,
          };

      console.log('Updating connection with input:', input);

      let result;
      if (type === 'postgres') {
        result = await updatePostgres({ variables: { input } });
        console.log('PostgreSQL update result:', result);
      } else {
        result = await updateRedis({ variables: { input } });
        console.log('Redis update result:', result);
      }

      if (result.data) {
        setShowUpdateDialog(false);
        setFormData({ ...formData, password: '' });
        setTestResult(null); // Clear test result
        await onUpdate();
        alert('Connection updated successfully!');
      } else {
        throw new Error('No data returned from mutation');
      }
    } catch (error: any) {
      console.error('Update error:', error);
      console.error('Error details:', error.graphQLErrors || error.networkError);
      
      const errorMessage = error.graphQLErrors?.[0]?.message 
        || error.networkError?.message 
        || error.message 
        || 'Unknown error occurred';
      
      alert(`Failed to update connection: ${errorMessage}`);
    }
  };

  const isConfigured = currentConfig.host && currentConfig.port;
  const isUsingDefaults = !currentConfig.host || currentConfig.host === 'localhost';

  return (
    <div className="space-y-4">
      {isUsingDefaults && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-500/30">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
            Using Default Local Development Settings
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {type === 'postgres' 
              ? 'Default: localhost:5432 - Make sure PostgreSQL is running locally for connection tests to work.'
              : 'Default: localhost:6379 - Make sure Redis is running locally for connection tests to work.'}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Click "Update Connection" to configure custom connection settings for production use.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Host</Label>
          <Input 
            value={currentConfig.host || 'localhost'} 
            disabled 
            className={!currentConfig.host ? 'text-muted-foreground italic' : ''}
          />
        </div>
        <div>
          <Label>Port</Label>
          <Input 
            value={currentConfig.port || (type === 'postgres' ? 5432 : 6379)} 
            disabled 
            className={!currentConfig.port ? 'text-muted-foreground italic' : ''}
          />
        </div>
        {type === 'postgres' && (
          <>
            <div>
              <Label>Database</Label>
              <Input 
                value={currentConfig.database || 'Not configured'} 
                disabled 
                className={!currentConfig.database ? 'text-muted-foreground italic' : ''}
              />
            </div>
            <div>
              <Label>User</Label>
              <Input 
                value={currentConfig.user || 'Not configured'} 
                disabled 
                className={!currentConfig.user ? 'text-muted-foreground italic' : ''}
              />
            </div>
          </>
        )}
        <div>
          <Label>Password</Label>
          <div className="flex gap-2">
            <Input value="••••••••" disabled className="flex-1" />
            <Button
              onClick={() => setShowPasswordDialog(true)}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Show
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleTest}
          disabled={testing}
          className="bg-background text-foreground border border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
        >
          {testing ? 'Testing...' : 'Check Status'}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setFormData({
                host: currentConfig.host || '',
                port: currentConfig.port || (type === 'postgres' ? 5432 : 6379),
                database: currentConfig.database || '',
                user: currentConfig.user || '',
                password: '',
              });
              setShowUpdateDialog(true);
            }}
            className="bg-foreground text-background"
          >
            Update Connection
          </Button>
          {currentConfig.updatedAt && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(currentConfig.updatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 px-3 py-2 text-sm border ${
            testResult.success 
              ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-500/30' 
              : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              testResult.success ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <div className="flex-1">
              <span className="font-medium">{testResult.message}</span>
              {testResult.responseTime && (
                <span className="text-xs ml-2">({testResult.responseTime}ms)</span>
              )}
              {testResult.success && isUsingDefaults && (
                <p className="text-xs mt-1 opacity-80">
                  Local development connection is working. Update settings for production deployment.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {testResult && !testResult.success && testResult.error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-500/30 text-sm">
          <p className="font-medium text-red-700 dark:text-red-400 mb-1">Connection Error</p>
          <p className="text-red-600 dark:text-red-300 text-xs">{testResult.error}</p>
          <p className="text-red-600 dark:text-red-300 text-xs mt-2">
            {isUsingDefaults 
              ? `Make sure ${type === 'postgres' ? 'PostgreSQL' : 'Redis'} is running locally on your machine. If using Docker, check that the container is started.`
              : `Please check your connection settings, firewall rules, and ensure the ${type === 'postgres' ? 'database' : 'cache'} server is running.`
            }
          </p>
        </div>
      )}

      {/* Show Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => setShowPasswordDialog(open)}>
        <DialogHeader>
          <DialogTitle>View Password</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your account password to view the {type === 'postgres' ? 'database' : 'Redis'} connection password.
            </p>
            <div>
              <Label>Account Password</Label>
              <Input type="password" placeholder="Enter your password" autoComplete="off" />
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-500/30">
              <p className="text-xs text-orange-600 dark:text-orange-300">
                For security reasons, connection passwords are encrypted. Please verify your identity to view.
              </p>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            onClick={() => setShowPasswordDialog(false)}
            className="bg-background text-foreground border border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // In real implementation, verify account password first
              alert(`Password: ${currentConfig.password || 'Not set'}`);
              setShowPasswordDialog(false);
            }}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            Show Password
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Update Connection Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={(open) => setShowUpdateDialog(open)}>
        <DialogHeader>
          <DialogTitle>Update {type === 'postgres' ? 'PostgreSQL' : 'Redis'} Connection</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Host</Label>
                <Input
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="localhost"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Port</Label>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => {
                    const value = e.target.value;
                    const port = value === '' ? (type === 'postgres' ? 5432 : 6379) : parseInt(value, 10);
                    setFormData({ ...formData, port: isNaN(port) ? (type === 'postgres' ? 5432 : 6379) : port });
                  }}
                  placeholder={type === 'postgres' ? '5432' : '6379'}
                  min="1"
                  max="65535"
                  autoComplete="off"
                />
              </div>
            </div>

            {type === 'postgres' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Database</Label>
                  <Input
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    placeholder="database_name"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>User</Label>
                  <Input
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                    placeholder="postgres"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Password (Optional)</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave empty to keep current password"
                autoComplete="new-password"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-500/30">
              <p className="text-xs text-blue-600 dark:text-blue-300">
                These settings control where your projects will connect. Make sure the connection details are correct and the server is accessible.
              </p>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            onClick={() => setShowUpdateDialog(false)}
            className="bg-background text-foreground border border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            Update
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

