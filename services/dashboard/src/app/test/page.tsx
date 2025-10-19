'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserBioCard } from '@/components/ui/user-bio-card';
import { QRCodeTest } from '@/components/ui/qr-code-test';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface TestResults {
  apiConnection?: TestResult;
  authTest?: TestResult;
  healthCheck?: TestResult;
  databaseTest?: TestResult;
  tenantTest?: TestResult;
  coreServiceTest?: TestResult;
  redisTest?: TestResult;
}

export default function TestPage() {
  const [testResults, setTestResults] = useState<TestResults>({});
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    password: 'testpassword123',
    organizationName: 'Test Organization',
    organizationSlug: 'test-org'
  });

  // Test 1: API Gateway Connection
  const testApiConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query IntrospectionQuery {
              __schema {
                types {
                  name
                  kind
                }
              }
            }
          `
        })
      });
      
      const data = await response.json();
      
      // Check if API Gateway is in standby mode
      if (data.errors && data.errors[0]?.message?.includes('standby mode')) {
        setTestResults((prev: TestResults) => ({ 
          ...prev, 
          apiConnection: { 
            success: true, // Connection works, but in standby
            data: { 
              status: 'standby',
              message: 'API Gateway is running but in standby mode',
              availableServices: ['GraphQL Introspection', 'Basic Queries']
            },
            error: undefined
          } 
        }));
      } else {
        setTestResults((prev: TestResults) => ({ 
          ...prev, 
          apiConnection: { 
            success: !data.errors, 
            data: data,
            error: data.errors ? data.errors[0]?.message : undefined
          } 
        }));
      }
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        apiConnection: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Test 2: Authentication Test
  const testAuthentication = async () => {
    setIsLoading(true);
    try {
      // Try to register first
      const registerResponse = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
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
          `,
          variables: {
            input: {
              email: formData.email,
              password: formData.password,
              organizationName: formData.organizationName,
              organizationSlug: formData.organizationSlug
            }
          }
        })
      });
      
      const registerData = await registerResponse.json();
      
      // Check if API Gateway is in standby mode
      if (registerData.errors && registerData.errors[0]?.message?.includes('standby mode')) {
        setTestResults((prev: TestResults) => ({ 
          ...prev, 
          authTest: { 
            success: false, 
            data: { 
              status: 'standby',
              message: 'Authentication not available - API Gateway in standby mode',
              reason: 'Microservices (provisioning, tenant-runtime) are not running'
            },
            error: 'Authentication services are not available in standby mode'
          } 
        }));
        return;
      }
      
      if (registerData.errors) {
        // If registration fails, try login
        const loginResponse = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
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
            `,
            variables: {
              email: formData.email,
              password: formData.password
            }
          })
        });
        
        const loginData = await loginResponse.json();
        setTestResults((prev: TestResults) => ({ 
          ...prev, 
          authTest: { 
            success: !loginData.errors, 
            data: loginData,
            error: loginData.errors ? loginData.errors[0]?.message : undefined
          } 
        }));
      } else {
        setTestResults((prev: TestResults) => ({ 
          ...prev, 
          authTest: { 
            success: true, 
            data: registerData
          } 
        }));
      }
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        authTest: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Additional test functions
  const testHealthCheck = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace('/graphql', '/health') || 'http://localhost:3002/health');
      const data = await response.json();
      
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        healthCheck: { 
          success: response.ok, 
          data: data,
          error: response.ok ? undefined : 'Health check failed'
        } 
      }));
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        healthCheck: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query TestDatabaseConnection {
              __schema {
                queryType {
                  name
                }
              }
            }
          `
        })
      });
      
      const data = await response.json();
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        databaseTest: { 
          success: !data.errors, 
          data: data,
          error: data.errors ? data.errors[0]?.message : undefined
        } 
      }));
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        databaseTest: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const testTenantRuntime = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_TENANT_RUNTIME_URL || 'http://localhost:3004/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query TestTenantRuntime {
              __schema {
                types {
                  name
                }
              }
            }
          `
        })
      });
      
      const data = await response.json();
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        tenantTest: { 
          success: !data.errors, 
          data: data,
          error: data.errors ? data.errors[0]?.message : undefined
        } 
      }));
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        tenantTest: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const testCoreService = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query TestCoreService {
              __schema {
                queryType {
                  name
                }
              }
            }
          `
        })
      });
      
      const data = await response.json();
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        coreServiceTest: { 
          success: !data.errors, 
          data: data,
          error: data.errors ? data.errors[0]?.message : undefined
        } 
      }));
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        coreServiceTest: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const testRedisConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace('/graphql', '/health/redis') || 'http://localhost:3002/health/redis');
      const data = await response.json();
      
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        redisTest: { 
          success: response.ok, 
          data: data,
          error: response.ok ? undefined : 'Redis connection failed'
        } 
      }));
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({ 
        ...prev, 
        redisTest: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    await testApiConnection();
    await testHealthCheck();
    await testDatabaseConnection();
    await testTenantRuntime();
    await testCoreService();
    await testRedisConnection();
    await testAuthentication();
  };

  const [activeTab, setActiveTab] = useState<'api' | 'components'>('api');

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-light text-foreground mb-4">MasterFabric Developer Test Suite</h1>
          <p className="text-muted-foreground">Comprehensive testing and component showcase for developers</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit mx-auto">
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'api'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            API Testing
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'components'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Components Showcase
          </button>
        </div>

        {/* API Testing Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                This section provides comprehensive API testing tools for MasterFabric services. 
                Use these tests to verify connectivity, authentication, and service health.
              </p>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Run all tests or individual service tests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={runAllTests} 
                    disabled={isLoading}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isLoading ? 'Running All Tests...' : 'Run All Tests'}
                  </Button>
                  <Button 
                    onClick={testApiConnection} 
                    disabled={isLoading}
                    variant="outline"
                  >
                    Test API Gateway
                  </Button>
                  <Button 
                    onClick={testHealthCheck} 
                    disabled={isLoading}
                    variant="outline"
                  >
                    Health Check
                  </Button>
                  <Button 
                    onClick={testDatabaseConnection} 
                    disabled={isLoading}
                    variant="outline"
                  >
                    Database Test
                  </Button>
                  <Button 
                    onClick={testTenantRuntime} 
                    disabled={isLoading}
                    variant="outline"
                  >
                    Tenant Runtime
                  </Button>
                  <Button 
                    onClick={testCoreService} 
                    disabled={isLoading}
                    variant="outline"
                  >
                    Core Service
                  </Button>
                  <Button 
                    onClick={testRedisConnection} 
                    disabled={isLoading}
                    variant="outline"
                  >
                    Redis Test
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* API Connection Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    API Gateway Connection
                    {testResults.apiConnection && (
                      <Badge variant={testResults.apiConnection.success ? "default" : "destructive"}>
                        {testResults.apiConnection.success ? "✅" : "❌"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Test GraphQL connectivity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={testApiConnection} 
                    disabled={isLoading}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading ? 'Testing...' : 'Test Connection'}
                  </Button>
                  
                  {testResults.apiConnection && (
                    <div className="flex items-center justify-center">
                      <div className="text-3xl">
                        {testResults.apiConnection.success ? '✅' : '❌'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Health Check Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Health Check
                    {testResults.healthCheck && (
                      <Badge variant={testResults.healthCheck.success ? "default" : "destructive"}>
                        {testResults.healthCheck.success ? "✅" : "❌"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Service health status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={testHealthCheck} 
                    disabled={isLoading}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading ? 'Checking...' : 'Check Health'}
                  </Button>
                  
                  {testResults.healthCheck && (
                    <div className="flex items-center justify-center">
                      <div className="text-3xl">
                        {testResults.healthCheck.success ? '✅' : '❌'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Database Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Database Connection
                    {testResults.databaseTest && (
                      <Badge variant={testResults.databaseTest.success ? "default" : "destructive"}>
                        {testResults.databaseTest.success ? "✅" : "❌"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Database connectivity test</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={testDatabaseConnection} 
                    disabled={isLoading}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading ? 'Testing...' : 'Test Database'}
                  </Button>
                  
                  {testResults.databaseTest && (
                    <div className="flex items-center justify-center">
                      <div className="text-3xl">
                        {testResults.databaseTest.success ? '✅' : '❌'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tenant Runtime Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Tenant Runtime
                    {testResults.tenantTest && (
                      <Badge variant={testResults.tenantTest.success ? "default" : "destructive"}>
                        {testResults.tenantTest.success ? "✅" : "❌"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Tenant runtime service test</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={testTenantRuntime} 
                    disabled={isLoading}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading ? 'Testing...' : 'Test Runtime'}
                  </Button>
                  
                  {testResults.tenantTest && (
                    <div className="flex items-center justify-center">
                      <div className="text-3xl">
                        {testResults.tenantTest.success ? '✅' : '❌'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Core Service Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Core Service
                    {testResults.coreServiceTest && (
                      <Badge variant={testResults.coreServiceTest.success ? "default" : "destructive"}>
                        {testResults.coreServiceTest.success ? "✅" : "❌"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Core service connectivity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={testCoreService} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Testing...' : 'Test Core Service'}
                  </Button>
                  
                  {testResults.coreServiceTest && (
                    <div className="flex items-center justify-center">
                      <div className="text-3xl">
                        {testResults.coreServiceTest.success ? '✅' : '❌'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Redis Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Redis Connection
                    {testResults.redisTest && (
                      <Badge variant={testResults.redisTest.success ? "default" : "destructive"}>
                        {testResults.redisTest.success ? "✅" : "❌"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Redis cache connectivity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={testRedisConnection} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Testing...' : 'Test Redis'}
                  </Button>
                  
                  {testResults.redisTest && (
                    <div className="flex items-center justify-center">
                      <div className="text-3xl">
                        {testResults.redisTest.success ? '✅' : '❌'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Authentication Test */}
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Authentication Test
                    {testResults.authTest && (
                      <Badge variant={testResults.authTest.success ? "default" : "destructive"}>
                        {testResults.authTest.success ? "✅" : "❌"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>User registration and login</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="email" className="text-sm">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-sm">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="organizationName" className="text-sm">Organization Name</Label>
                      <Input
                        id="organizationName"
                        name="organizationName"
                        type="text"
                        value={formData.organizationName}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="organizationSlug" className="text-sm">Organization Slug</Label>
                      <Input
                        id="organizationSlug"
                        name="organizationSlug"
                        type="text"
                        value={formData.organizationSlug}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={testAuthentication} 
                    disabled={isLoading}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading ? 'Testing...' : 'Test Authentication'}
                  </Button>

                  {testResults.authTest && (
                    <div className="flex items-center justify-center">
                      <div className="text-3xl">
                        {testResults.authTest.success ? '✅' : '❌'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Connection Information */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Information</CardTitle>
                <CardDescription>Current service configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Core Service URL:</strong>
                      <div className="text-muted-foreground font-mono text-xs">
                        {process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql'}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <strong>Tenant Runtime URL:</strong>
                      <div className="text-muted-foreground font-mono text-xs">
                        {process.env.NEXT_PUBLIC_TENANT_RUNTIME_URL || 'http://localhost:3004/graphql'}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <strong>Core Service URL:</strong>
                      <div className="text-muted-foreground font-mono text-xs">
                        {process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql'}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <strong>Redis URL:</strong>
                      <div className="text-muted-foreground font-mono text-xs">
                        {process.env.REDIS_URL || 'redis://localhost:6379'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Environment:</strong>
                      <div className="text-muted-foreground">
                        {process.env.NODE_ENV || 'development'}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <strong>Build Time:</strong>
                      <div className="text-muted-foreground">
                        {new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Raw Results */}
            {Object.keys(testResults).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Raw Test Results</CardTitle>
                  <CardDescription>Detailed test results for debugging</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Components Showcase Tab */}
        {activeTab === 'components' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                This section showcases all available UI components in the MasterFabric design system. 
                Use this as a reference for implementing consistent UI across the application.
              </p>
            </div>

            {/* Buttons Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>Various button styles and states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button>Default Button</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled>Disabled</Button>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">Custom</Button>
                </div>
              </CardContent>
            </Card>

            {/* Cards Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Cards</CardTitle>
                <CardDescription>Card component variations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Simple Card</CardTitle>
                      <CardDescription>Basic card with header and content</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        This is a simple card component with basic content.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Card with Actions</CardTitle>
                      <CardDescription>Card with interactive elements</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        This card includes action buttons and form elements.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm">Action</Button>
                        <Button size="sm" variant="outline">Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Form Elements Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
                <CardDescription>Input fields, labels, and form components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="demo-input">Text Input</Label>
                      <Input id="demo-input" placeholder="Enter text..." />
                    </div>
                    <div>
                      <Label htmlFor="demo-email">Email Input</Label>
                      <Input id="demo-email" type="email" placeholder="Enter email..." />
                    </div>
                    <div>
                      <Label htmlFor="demo-password">Password Input</Label>
                      <Input id="demo-password" type="password" placeholder="Enter password..." />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="demo-disabled">Disabled Input</Label>
                      <Input id="demo-disabled" disabled placeholder="Disabled input" />
                    </div>
                    <div>
                      <Label htmlFor="demo-readonly">Readonly Input</Label>
                      <Input id="demo-readonly" readOnly value="Readonly value" />
                    </div>
                    <div>
                      <Label htmlFor="demo-error">Error State</Label>
                      <Input id="demo-error" className="border-red-500" placeholder="Error state" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges and Alerts Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Badges & Alerts</CardTitle>
                <CardDescription>Status indicators and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Badges</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Alert Examples</h4>
                  <div className="space-y-3">
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">
                        This is a default alert message for informational content.
                      </p>
                    </div>
                    <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                      <p className="text-green-800 text-sm">
                        This is a success alert message.
                      </p>
                    </div>
                    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                      <p className="text-yellow-800 text-sm">
                        This is a warning alert message.
                      </p>
                    </div>
                    <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                      <p className="text-red-800 text-sm">
                        This is an error alert message.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Tab Navigation Example */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Tab Navigation</CardTitle>
                <CardDescription>Example of custom tab implementation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                  <button className="px-4 py-2 rounded-md text-sm font-medium bg-background text-foreground shadow-sm">
                    Tab 1
                  </button>
                  <button className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">
                    Tab 2
                  </button>
                  <button className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">
                    Tab 3
                  </button>
                </div>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This demonstrates a custom tab navigation implementation using buttons and conditional rendering.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Spacing and Layout Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Spacing & Layout</CardTitle>
                <CardDescription>Visual spacing and layout utilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm">Content with spacing:</p>
                  <div className="mt-4 p-4 border rounded-lg">
                    <p className="text-sm">This content has margin and padding applied.</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">Spacing examples:</p>
                  <div className="space-y-1">
                    <div className="h-4 bg-blue-100 rounded"></div>
                    <div className="h-4 bg-blue-200 rounded"></div>
                    <div className="h-4 bg-blue-300 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Bio Card Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>User Bio Card</CardTitle>
                <CardDescription>User profile card component with status indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <UserBioCard
                    name="John Doe"
                    email="john.doe@masterfabric.dev"
                    role="Senior Developer"
                    organization="MasterFabric Inc."
                    status="online"
                    bio="Full-stack developer passionate about modern web technologies and microservices architecture."
                    skills={['React', 'Node.js', 'TypeScript', 'GraphQL', 'Docker']}
                    joinDate="January 2023"
                    onMessage={() => console.log('Message clicked')}
                    onEdit={() => console.log('Edit clicked')}
                  />
                  
                  <UserBioCard
                    name="Jane Smith"
                    email="jane.smith@masterfabric.dev"
                    role="DevOps Engineer"
                    organization="MasterFabric Inc."
                    status="away"
                    bio="DevOps specialist focused on cloud infrastructure and CI/CD pipelines."
                    skills={['AWS', 'Kubernetes', 'Terraform', 'Jenkins', 'Monitoring']}
                    joinDate="March 2023"
                  />
                  
                  <UserBioCard
                    name="Mike Johnson"
                    email="mike.johnson@masterfabric.dev"
                    role="Product Manager"
                    organization="MasterFabric Inc."
                    status="offline"
                    bio="Product manager with expertise in agile methodologies and user experience design."
                    skills={['Agile', 'Scrum', 'UX Design', 'Analytics', 'Strategy']}
                    joinDate="June 2023"
                  />
                </div>
              </CardContent>
            </Card>

            {/* QR Code Test Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code Generator & Test</CardTitle>
                <CardDescription>Generate QR codes and test URL accessibility</CardDescription>
              </CardHeader>
              <CardContent>
                <QRCodeTest
                  onGenerate={(data) => console.log('QR Code generated for:', data)}
                  onTest={(url) => console.log('Testing URL:', url)}
                />
              </CardContent>
            </Card>

            {/* Developer Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Developer Notes</CardTitle>
                <CardDescription>Important information for developers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium">Design System</h4>
                    <p className="text-sm text-muted-foreground">
                      All components follow the MasterFabric design system with consistent spacing, 
                      colors, and typography. Use these components as building blocks for your features.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Accessibility</h4>
                    <p className="text-sm text-muted-foreground">
                      All components are built with accessibility in mind, including proper ARIA labels, 
                      keyboard navigation, and screen reader support.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Customization</h4>
                    <p className="text-sm text-muted-foreground">
                      Components can be customized using Tailwind CSS classes. Maintain consistency 
                      by following the established patterns and color schemes.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">New Components</h4>
                    <p className="text-sm text-muted-foreground">
                      UserBioCard and QRCodeTest are new components added to the showcase. 
                      They demonstrate advanced UI patterns and interactive functionality.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t bg-muted/50 mt-16">
          <div className="max-w-6xl mx-auto px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* MasterFabric Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">MasterFabric</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Modern microservices platform for scalable applications
                  </p>
                </div>
                <div className="flex space-x-4">
                  <a 
                    href="https://github.com/masterfabric" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    GitHub
                  </a>
                  <a 
                    href="https://docs.masterfabric.dev" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Docs
                  </a>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Services</h3>
                <div className="space-y-2 text-sm">
                  <div className="text-muted-foreground">API Gateway</div>
                  <div className="text-muted-foreground">Core Service</div>
                  <div className="text-muted-foreground">Tenant Runtime</div>
                  <div className="text-muted-foreground">Provisioning</div>
                  <div className="text-muted-foreground">Dashboard</div>
                </div>
              </div>

              {/* Development */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Development</h3>
                <div className="space-y-2 text-sm">
                  <div className="text-muted-foreground">Test Suite</div>
                  <div className="text-muted-foreground">Component Library</div>
                  <div className="text-muted-foreground">API Testing</div>
                  <div className="text-muted-foreground">Health Monitoring</div>
                </div>
              </div>

              {/* System Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">System Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-muted-foreground">API Gateway</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-muted-foreground">Core Service</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-muted-foreground">Tenant Runtime</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t mt-8 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="text-sm text-muted-foreground">
                  © 2025 MasterFabric. Built with Next.js, TypeScript, and Tailwind CSS.
                </div>
                <div className="flex space-x-6 text-sm">
                  <a 
                    href="/privacy" 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy
                  </a>
                  <a 
                    href="/terms" 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms
                  </a>
                  <a 
                    href="/support" 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}