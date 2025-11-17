'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserBioCard } from '@/components/ui/user-bio-card';
import { QRCodeTest } from '@/components/ui/qr-code-test';
import { Dropdown, MultiSelectDropdown } from '@/components/ui/dropdown';
import { SearchDropdown } from '@/components/ui/search-dropdown';
import { FooterSystemStatus } from '@/components/FooterSystemStatus';
import { SignIn } from '@/components/ui/sign-in';
import { SignUp } from '@/components/ui/sign-up';
import { ForgotPassword } from '@/components/ui/forgot-password';
import { MagicLink } from '@/components/ui/magic-link';
import { QRCodeSignIn } from '@/components/ui/qr-code-sign-in';
import { Toast, useToast, ToastContainer } from '@/components/ui/toast';
import { ProgressCard, ProcessingRequestCard, ProgressCardGroup } from '@/components/ui/progress-card';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  lastTestedAt?: string;
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

  // Dropdown states
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedFramework, setSelectedFramework] = useState('');
  
  // Toast management
  const toast = useToast();
  
  // Progress card states
  const [progressValue, setProgressValue] = useState(0);
  const [isProgressing, setIsProgressing] = useState(false);

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
            lastTestedAt: new Date().toISOString(),
            error: undefined
          } 
        }));
      } else {
        setTestResults((prev: TestResults) => ({ 
          ...prev, 
          apiConnection: { 
            success: !data.errors, 
            data: data,
            lastTestedAt: new Date().toISOString(),
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
            lastTestedAt: new Date().toISOString(),
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
            lastTestedAt: new Date().toISOString(),
            error: loginData.errors ? loginData.errors[0]?.message : undefined
          } 
        }));
      } else {
        setTestResults((prev: TestResults) => ({ 
          ...prev, 
          authTest: { 
            success: true, 
            data: registerData,
            lastTestedAt: new Date().toISOString()
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
          lastTestedAt: new Date().toISOString(),
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
          lastTestedAt: new Date().toISOString(),
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
          lastTestedAt: new Date().toISOString(),
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
          lastTestedAt: new Date().toISOString(),
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
          lastTestedAt: new Date().toISOString(),
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

            {/* Quick Actions removed as requested */}

            {/* Test Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* API Connection Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    API Gateway Connection
                    {testResults.apiConnection && (
                      <Badge variant={testResults.apiConnection.success ? "default" : "destructive"}>
                        {testResults.apiConnection.success ? "Success" : "Failed"}
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
                  
                  {/* Emoji indicator removed; status shown via Badge in title */}
                </CardContent>
              </Card>

              {/* Health Check Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Health Check
                    {testResults.healthCheck && (
                      <Badge variant={testResults.healthCheck.success ? "default" : "destructive"}>
                        {testResults.healthCheck.success ? "Success" : "Failed"}
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
                  
                  {/* Emoji indicator removed; status shown via Badge in title */}
                </CardContent>
              </Card>

              {/* Database Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Database Connection
                    {testResults.databaseTest && (
                      <Badge variant={testResults.databaseTest.success ? "default" : "destructive"}>
                        {testResults.databaseTest.success ? "Success" : "Failed"}
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
                  
                  {/* Emoji indicator removed; status shown via Badge in title */}
                </CardContent>
              </Card>

              {/* Tenant Runtime Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Tenant Runtime
                    {testResults.tenantTest && (
                      <Badge variant={testResults.tenantTest.success ? "default" : "destructive"}>
                        {testResults.tenantTest.success ? "Success" : "Failed"}
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
                  
                  {/* Emoji indicator removed; status shown via Badge in title */}
                </CardContent>
              </Card>

              {/* Core Service Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Core Service
                    {testResults.coreServiceTest && (
                      <Badge variant={testResults.coreServiceTest.success ? "default" : "destructive"}>
                        {testResults.coreServiceTest.success ? "Success" : "Failed"}
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
                  
                  {/* Emoji indicator removed; status shown via Badge in title */}
                </CardContent>
              </Card>

              {/* Redis Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Redis Connection
                    {testResults.redisTest && (
                      <Badge variant={testResults.redisTest.success ? "default" : "destructive"}>
                        {testResults.redisTest.success ? "Success" : "Failed"}
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
                  
                  {/* Emoji indicator removed; status shown via Badge in title */}
                </CardContent>
              </Card>

              {/* Authentication Test */}
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Authentication Test
                    {testResults.authTest && (
                      <Badge variant={testResults.authTest.success ? "default" : "destructive"}>
                        {testResults.authTest.success ? "Success" : "Failed"}
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

                  {/* Emoji indicator removed; status shown via Badge in title */}
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
                <div className="flex flex-wrap gap-2 items-center">
                  <Button isLoading size="sm">Action</Button>
                  <Button isLoading variant="secondary">Processing</Button>
                  <Button isLoading variant="outline">Loading</Button>
                  <Button isLoading variant="ghost">Loading</Button>
                  <Button isLoading variant="destructive">Deleting</Button>
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

            {/* Authentication Components Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Authentication Components</CardTitle>
                <CardDescription>Functional authentication components for sign-in, sign-up, password reset, magic link, and QR code authentication</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SignIn showLinks={false} />
                  <SignUp showLinks={false} />
                  <ForgotPassword />
                  <MagicLink />
                  <div className="md:col-span-2">
                    <QRCodeSignIn />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dropdown Components Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Dropdown Components</CardTitle>
                <CardDescription>Various dropdown and select components with different features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="country-dropdown" className="text-sm">Country Selection</Label>
                      <Dropdown
                        options={[
                          { value: 'us', label: 'United States' },
                          { value: 'ca', label: 'Canada' },
                          { value: 'uk', label: 'United Kingdom' },
                          { value: 'de', label: 'Germany' },
                          { value: 'fr', label: 'France' },
                          { value: 'jp', label: 'Japan' },
                          { value: 'au', label: 'Australia' },
                          { value: 'br', label: 'Brazil' },
                        ]}
                        value={selectedCountry}
                        placeholder="Select a country"
                        onValueChange={setSelectedCountry}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="skills-dropdown" className="text-sm">Skills (Multi-select)</Label>
                      <MultiSelectDropdown
                        options={[
                          { value: 'react', label: 'React' },
                          { value: 'vue', label: 'Vue.js' },
                          { value: 'angular', label: 'Angular' },
                          { value: 'node', label: 'Node.js' },
                          { value: 'python', label: 'Python' },
                          { value: 'java', label: 'Java' },
                          { value: 'typescript', label: 'TypeScript' },
                          { value: 'graphql', label: 'GraphQL' },
                          { value: 'docker', label: 'Docker' },
                          { value: 'kubernetes', label: 'Kubernetes' },
                        ]}
                        values={selectedSkills}
                        placeholder="Select your skills"
                        onValuesChange={setSelectedSkills}
                        maxDisplayed={2}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="framework-dropdown" className="text-sm">Framework (Searchable)</Label>
                      <SearchDropdown
                        options={[
                          { 
                            value: 'nextjs', 
                            label: 'Next.js', 
                            description: 'React framework for production',
                            group: 'React'
                          },
                          { 
                            value: 'nuxt', 
                            label: 'Nuxt.js', 
                            description: 'Vue.js framework for production',
                            group: 'Vue'
                          },
                          { 
                            value: 'sveltekit', 
                            label: 'SvelteKit', 
                            description: 'Svelte framework for production',
                            group: 'Svelte'
                          },
                          { 
                            value: 'remix', 
                            label: 'Remix', 
                            description: 'Full-stack web framework',
                            group: 'React'
                          },
                          { 
                            value: 'astro', 
                            label: 'Astro', 
                            description: 'Static site generator',
                            group: 'Static'
                          },
                          { 
                            value: 'gatsby', 
                            label: 'Gatsby', 
                            description: 'React-based static site generator',
                            group: 'React'
                          },
                        ]}
                        value={selectedFramework}
                        placeholder="Search and select a framework"
                        searchPlaceholder="Search frameworks..."
                        onValueChange={setSelectedFramework}
                        allowClear
                        groupBy
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="disabled-dropdown" className="text-sm">Disabled Dropdown</Label>
                      <Dropdown
                        options={[
                          { value: 'option1', label: 'Option 1' },
                          { value: 'option2', label: 'Option 2' },
                        ]}
                        placeholder="This dropdown is disabled"
                        disabled
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Selected Values Display */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Selected Values:</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Country:</strong> 
                      <span className="ml-2 text-muted-foreground">
                        {selectedCountry || 'None selected'}
                      </span>
                    </div>
                    <div>
                      <strong>Skills:</strong> 
                      <span className="ml-2 text-muted-foreground">
                        {selectedSkills.length > 0 ? selectedSkills.join(', ') : 'None selected'}
                      </span>
                    </div>
                    <div>
                      <strong>Framework:</strong> 
                      <span className="ml-2 text-muted-foreground">
                        {selectedFramework || 'None selected'}
                      </span>
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

            {/* Progress Card Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Cards</CardTitle>
                <CardDescription>Card components for displaying progress, loading states, and status updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Progress Card Variants</h4>
                  <ProgressCardGroup columns={2}>
                    <ProgressCard
                      status="loading"
                      title="Processing your request"
                      description="Please wait while we process your request. Do not refresh the page."
                      onCancel={() => console.log('Cancelled')}
                    />
                    <ProgressCard
                      status="loading"
                      title="Uploading files"
                      description="Uploading 3 files... This may take a few minutes."
                      showProgress
                      progress={45}
                      onCancel={() => console.log('Cancelled')}
                    />
                    <ProgressCard
                      status="success"
                      title="Request completed"
                      description="Your request has been processed successfully."
                    />
                    <ProgressCard
                      status="error"
                      title="Request failed"
                      description="An error occurred while processing your request. Please try again."
                    />
                    <ProgressCard
                      status="warning"
                      title="Action required"
                      description="Please review the changes before proceeding."
                    />
                    <ProgressCard
                      status="pending"
                      title="Waiting for approval"
                      description="Your request is pending approval from an administrator."
                    />
                  </ProgressCardGroup>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Processing Request Card</h4>
                  <div className="max-w-md mx-auto">
                    <ProcessingRequestCard
                      title="Processing your request"
                      description="Please wait while we process your request. Do not refresh the page."
                      onCancel={() => console.log('Cancelled')}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Interactive Test Demo</h4>
                  <div className="space-y-6">
                    {/* Progress Simulation */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Progress Simulation</Label>
                      <div className="space-y-4">
                        <div className="max-w-md mx-auto">
                          <ProgressCard
                            status={isProgressing ? 'loading' : progressValue === 100 ? 'success' : progressValue > 0 && progressValue < 100 ? 'loading' : 'pending'}
                            title={
                              isProgressing
                                ? 'Processing your request'
                                : progressValue === 100
                                ? 'Request completed'
                                : progressValue > 0
                                ? 'Processing your request'
                                : 'Ready to start'
                            }
                            description={
                              isProgressing
                                ? 'Please wait while we process your request. Do not refresh the page.'
                                : progressValue === 100
                                ? 'Your request has been processed successfully.'
                                : progressValue > 0
                                ? `Processing... ${progressValue}% complete`
                                : 'Click start to begin processing.'
                            }
                            showProgress={isProgressing || progressValue > 0}
                            progress={progressValue}
                            onCancel={isProgressing ? () => {
                              setIsProgressing(false);
                              setProgressValue(0);
                            } : undefined}
                            cancelLabel={isProgressing ? 'Cancel' : undefined}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={() => {
                              setIsProgressing(true);
                              setProgressValue(0);
                              const interval = setInterval(() => {
                                setProgressValue((prev) => {
                                  if (prev >= 100) {
                                    clearInterval(interval);
                                    setIsProgressing(false);
                                    return 100;
                                  }
                                  return prev + 10;
                                });
                              }, 500);
                            }}
                            disabled={isProgressing}
                          >
                            Start Processing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setProgressValue(0);
                              setIsProgressing(false);
                            }}
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Status Change Test */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Status Change Test</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            toast.showSuccess('Status changed', 'Progress card status updated to loading');
                            setIsProgressing(true);
                            setProgressValue(0);
                          }}
                        >
                          Test Loading
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsProgressing(false);
                            setProgressValue(100);
                            toast.showSuccess('Status changed', 'Progress card status updated to success');
                          }}
                        >
                          Test Success
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsProgressing(false);
                            setProgressValue(0);
                            toast.showWarning('Status changed', 'Progress card status updated to pending');
                          }}
                        >
                          Test Pending
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsProgressing(false);
                            setProgressValue(0);
                            toast.showInfo('Status changed', 'Progress card reset');
                          }}
                        >
                          Reset All
                        </Button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Quick Actions</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsProgressing(true);
                            setProgressValue(25);
                            setTimeout(() => setProgressValue(50), 1000);
                            setTimeout(() => setProgressValue(75), 2000);
                            setTimeout(() => {
                              setProgressValue(100);
                              setIsProgressing(false);
                            }, 3000);
                          }}
                          disabled={isProgressing}
                        >
                          Simulate Upload (25% → 50% → 75% → 100%)
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setIsProgressing(true);
                            setProgressValue(0);
                            let current = 0;
                            const interval = setInterval(() => {
                              current += 5;
                              setProgressValue(current);
                              if (current >= 100) {
                                clearInterval(interval);
                                setIsProgressing(false);
                              }
                            }, 200);
                          }}
                          disabled={isProgressing}
                        >
                          Fast Progress (5% increments)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsProgressing(true);
                            setProgressValue(0);
                            let current = 0;
                            const interval = setInterval(() => {
                              current += 1;
                              setProgressValue(current);
                              if (current >= 100) {
                                clearInterval(interval);
                                setIsProgressing(false);
                              }
                            }, 50);
                          }}
                          disabled={isProgressing}
                        >
                          Smooth Progress (1% increments)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Toast Variants Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Toast Variants</CardTitle>
                <CardDescription>Toast notifications with different variants and styles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Toast Examples</h4>
                  <div className="space-y-4">
                    <Toast
                      variant="default"
                      title="Default Toast"
                      description="This is a default toast notification"
                    />
                    <Toast
                      variant="success"
                      title="Success!"
                      description="Your changes have been saved successfully"
                    />
                    <Toast
                      variant="error"
                      title="Error"
                      description="Something went wrong. Please try again."
                    />
                    <Toast
                      variant="warning"
                      title="Warning"
                      description="Please review your settings before continuing"
                    />
                    <Toast
                      variant="info"
                      title="Information"
                      description="New features are available in your dashboard"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Toast with Actions</h4>
                  <div className="space-y-4">
                    <Toast
                      variant="success"
                      title="File uploaded"
                      description="Your file has been uploaded successfully"
                      action={{
                        label: "View",
                        onClick: () => console.log("View clicked")
                      }}
                    />
                    <Toast
                      variant="error"
                      title="Failed to delete"
                      description="The item could not be deleted"
                      action={{
                        label: "Retry",
                        onClick: () => console.log("Retry clicked")
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Interactive Toast Demo</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click the buttons below to trigger toast notifications with different options
                  </p>
                  
                  <div className="space-y-4">
                    {/* Basic Variants */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Basic Variants</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => toast.showSuccess('Success!', 'Operation completed successfully', 3000)}
                        >
                          Show Success Toast
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => toast.showError('Error!', 'An error occurred', 3000)}
                        >
                          Show Error Toast
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.showWarning('Warning!', 'Please check your input', 3000)}
                        >
                          Show Warning Toast
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toast.showInfo('Info', 'New update available', 3000)}
                        >
                          Show Info Toast
                        </Button>
                      </div>
                    </div>

                    {/* Toasts with Actions */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Toasts with Actions</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => toast.addToast({
                            variant: 'success',
                            title: 'File uploaded',
                            description: 'document.pdf has been uploaded successfully',
                            duration: 5000,
                            action: {
                              label: 'View',
                              onClick: () => console.log('View file clicked')
                            }
                          })}
                        >
                          Success with Action
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => toast.addToast({
                            variant: 'error',
                            title: 'Failed to delete',
                            description: 'The item could not be deleted. Please try again.',
                            duration: 5000,
                            action: {
                              label: 'Retry',
                              onClick: () => console.log('Retry clicked')
                            }
                          })}
                        >
                          Error with Action
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.addToast({
                            variant: 'warning',
                            title: 'Unsaved changes',
                            description: 'You have unsaved changes that will be lost',
                            duration: 6000,
                            action: {
                              label: 'Save Now',
                              onClick: () => console.log('Save clicked')
                            }
                          })}
                        >
                          Warning with Action
                        </Button>
                      </div>
                    </div>

                    {/* Duration Options */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Different Durations</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.showSuccess('Quick Toast', 'This disappears in 1 second', 1000)}
                        >
                          Quick (1s)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.showInfo('Standard Toast', 'This disappears in 3 seconds', 3000)}
                        >
                          Standard (3s)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.showWarning('Long Toast', 'This disappears in 6 seconds', 6000)}
                        >
                          Long (6s)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.showInfo('Persistent Toast', 'This stays until manually closed', 0)}
                        >
                          Persistent (∞)
                        </Button>
                      </div>
                    </div>

                    {/* Multiple Toasts */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Multiple Toasts</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            toast.showSuccess('Toast 1', 'First notification');
                            setTimeout(() => toast.showInfo('Toast 2', 'Second notification'), 300);
                            setTimeout(() => toast.showWarning('Toast 3', 'Third notification'), 600);
                          }}
                        >
                          Show 3 Toasts
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            for (let i = 1; i <= 5; i++) {
                              setTimeout(() => {
                                toast.showInfo(`Notification ${i}`, `This is toast number ${i}`, 4000);
                              }, i * 200);
                            }
                          }}
                        >
                          Show 5 Toasts
                        </Button>
                      </div>
                    </div>

                    {/* Custom Messages */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Custom Messages</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => toast.showSuccess(
                            'Welcome back!',
                            'You have 3 new messages and 2 pending tasks',
                            4000
                          )}
                        >
                          Welcome Message
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.showInfo(
                            'System Update',
                            'A new version is available. Click here to update.',
                            5000
                          )}
                        >
                          Update Notification
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => toast.showError(
                            'Connection Lost',
                            'Unable to connect to server. Check your internet connection.',
                            0
                          )}
                        >
                          Error Notification
                        </Button>
                      </div>
                    </div>

                    {/* Toast Management */}
                    <div className="border-t pt-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">Toast Management</Label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            toast.toasts.forEach(t => toast.removeToast(t.id));
                          }}
                          disabled={toast.toasts.length === 0}
                        >
                          Clear All ({toast.toasts.length})
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {toast.toasts.length === 0 
                            ? 'No active toasts' 
                            : `${toast.toasts.length} toast${toast.toasts.length > 1 ? 's' : ''} active`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accordion Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Accordion</CardTitle>
                <CardDescription>Expandable content sections</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion className="w-full" defaultValue={["item-1"]} type="multiple">
                  <AccordionItem value="item-1">
                    <AccordionTrigger value="item-1" className="px-2">
                      Getting Started
                    </AccordionTrigger>
                    <AccordionContent value="item-1" className="px-2">
                      Learn how to set up your environment and run the platform locally.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger value="item-2" className="px-2">
                      API & GraphQL
                    </AccordionTrigger>
                    <AccordionContent value="item-2" className="px-2">
                      Explore the auto-generated GraphQL APIs and available operations.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger value="item-3" className="px-2">
                      Security & Auth
                    </AccordionTrigger>
                    <AccordionContent value="item-3" className="px-2">
                      Authentication, authorization, and multi-tenant access control.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Side Menu Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Side Menu</CardTitle>
                <CardDescription>Static preview of the dashboard side navigation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-foreground/10 grid grid-cols-12">
                  <aside className="col-span-4 md:col-span-3 lg:col-span-2 bg-background">
                    <div className="p-4 border-r border-foreground/10 h-full">
                      <div className="mb-4 text-lg font-light">MasterFabric</div>
                      <nav className="space-y-1">
                        <div className="px-3 py-2 text-foreground hover:bg-muted">Organizations</div>
                        <div className="px-3 py-2 text-foreground hover:bg-muted">Projects</div>
                        <div className="px-3 py-2 text-foreground hover:bg-muted">Settings</div>
                      </nav>
                      <div className="mt-6 pt-4 border-t border-foreground/10">
                        <div className="text-xs text-muted-foreground">user@masterfabric.dev</div>
                      </div>
                    </div>
                  </aside>
                  <div className="col-span-8 md:col-span-9 lg:col-span-10 p-6">
                    <div className="text-sm text-muted-foreground">
                      Main content area preview. This demonstrates layout proportions next to the side menu.
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
                      UserBioCard, QRCodeTest, Dropdown components, and Authentication components are new additions to the showcase. 
                      The authentication components include sign-in, sign-up, forgot password, magic link, and QR code sign-in with full functionality.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Toast Container - Always visible */}
        <ToastContainer
          toasts={toast.toasts}
          onRemove={toast.removeToast}
          position="top-right"
        />

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
              <FooterSystemStatus />
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

