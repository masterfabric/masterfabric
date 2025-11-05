'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DiagnosticsPage() {
  const [results, setResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    const diagnostics: any = {
      environment: {},
      connectivity: {},
      graphql: {},
      timestamp: new Date().toISOString(),
    };

    // 1. Check Environment Variables
    diagnostics.environment = {
      apiGatewayUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'NOT SET',
      coreServiceUrl: process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'NOT SET',
      tenantRuntimeUrl: process.env.NEXT_PUBLIC_TENANT_RUNTIME_URL || 'NOT SET',
      nodeEnv: process.env.NODE_ENV || 'NOT SET',
    };

    // 2. Test API Gateway Connectivity
    try {
      const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql';
      const response = await fetch(apiGatewayUrl.replace('/graphql', '/health'), {
        method: 'GET',
      });
      diagnostics.connectivity.apiGateway = {
        url: apiGatewayUrl,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      };
    } catch (error: any) {
      diagnostics.connectivity.apiGateway = {
        url: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql',
        error: error.message,
        ok: false,
      };
    }

    // 3. Test Core Service Connectivity
    try {
      const coreServiceUrl = process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:3005/graphql';
      const response = await fetch(coreServiceUrl.replace('/graphql', '/health'), {
        method: 'GET',
      });
      diagnostics.connectivity.coreService = {
        url: coreServiceUrl,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      };
    } catch (error: any) {
      diagnostics.connectivity.coreService = {
        url: process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:3005/graphql',
        error: error.message,
        ok: false,
      };
    }

    // 4. Test GraphQL Query (Health Check)
    try {
      const coreServiceUrl = process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:3005/graphql';
      const response = await fetch(coreServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `query { systemHealth { overallStatus timestamp } }`,
        }),
      });
      const data = await response.json();
      diagnostics.graphql.healthQuery = {
        url: coreServiceUrl,
        ok: response.ok,
        status: response.status,
        data: data,
        hasErrors: !!data.errors,
      };
    } catch (error: any) {
      diagnostics.graphql.healthQuery = {
        error: error.message,
        ok: false,
      };
    }

    // 5. Test Login Mutation (without actual credentials)
    try {
      const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql';
      const response = await fetch(apiGatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation { login(email: "test@test.com", password: "test") { token } }`,
        }),
      });
      const data = await response.json();
      diagnostics.graphql.loginMutation = {
        url: apiGatewayUrl,
        ok: response.ok,
        status: response.status,
        reachable: true,
        hasErrors: !!data.errors,
        errorMessage: data.errors ? data.errors[0]?.message : null,
        expectedError: data.errors?.[0]?.message?.includes('Invalid credentials') || data.errors?.[0]?.message?.includes('Unauthorized'),
      };
    } catch (error: any) {
      diagnostics.graphql.loginMutation = {
        error: error.message,
        ok: false,
        reachable: false,
      };
    }

    setResults(diagnostics);
    setTesting(false);
  };

  const getStatusBadge = (ok: boolean) => {
    return ok ? (
      <Badge className="bg-green-500">✓ OK</Badge>
    ) : (
      <Badge className="bg-red-500">✗ Failed</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-light text-foreground mb-2">System Diagnostics</h1>
          <p className="text-muted-foreground">
            Check connectivity and configuration issues
          </p>
        </div>

        <Button
          onClick={runDiagnostics}
          disabled={testing}
          className="bg-foreground text-background hover:bg-muted-foreground"
        >
          {testing ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>

        {Object.keys(results).length > 0 && (
          <div className="space-y-6">
            {/* Environment Variables */}
            <Card>
              <CardHeader>
                <CardTitle>Environment Configuration</CardTitle>
                <CardDescription>Current environment variable settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(results.environment || {}).map(([key, value]: any) => (
                  <div key={key} className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-mono text-sm">{key}</span>
                    <span className="text-sm text-muted-foreground">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Connectivity Tests */}
            <Card>
              <CardHeader>
                <CardTitle>Service Connectivity</CardTitle>
                <CardDescription>HTTP connectivity to services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* API Gateway */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">API Gateway</span>
                    {getStatusBadge(results.connectivity?.apiGateway?.ok)}
                  </div>
                  <div className="text-sm space-y-1 pl-4">
                    <div>URL: <span className="font-mono text-xs">{results.connectivity?.apiGateway?.url}</span></div>
                    {results.connectivity?.apiGateway?.error && (
                      <div className="text-red-500">Error: {results.connectivity?.apiGateway?.error}</div>
                    )}
                    {results.connectivity?.apiGateway?.status && (
                      <div>Status: {results.connectivity?.apiGateway?.status} - {results.connectivity?.apiGateway?.statusText}</div>
                    )}
                  </div>
                </div>

                {/* Core Service */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Core Service</span>
                    {getStatusBadge(results.connectivity?.coreService?.ok)}
                  </div>
                  <div className="text-sm space-y-1 pl-4">
                    <div>URL: <span className="font-mono text-xs">{results.connectivity?.coreService?.url}</span></div>
                    {results.connectivity?.coreService?.error && (
                      <div className="text-red-500">Error: {results.connectivity?.coreService?.error}</div>
                    )}
                    {results.connectivity?.coreService?.status && (
                      <div>Status: {results.connectivity?.coreService?.status} - {results.connectivity?.coreService?.statusText}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GraphQL Tests */}
            <Card>
              <CardHeader>
                <CardTitle>GraphQL Queries</CardTitle>
                <CardDescription>Test GraphQL endpoint functionality</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Health Query */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Health Query</span>
                    {getStatusBadge(results.graphql?.healthQuery?.ok && !results.graphql?.healthQuery?.hasErrors)}
                  </div>
                  <div className="text-sm space-y-1 pl-4">
                    {results.graphql?.healthQuery?.error && (
                      <div className="text-red-500">Error: {results.graphql?.healthQuery?.error}</div>
                    )}
                    {results.graphql?.healthQuery?.data && (
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(results.graphql?.healthQuery?.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Login Mutation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Login Mutation Endpoint</span>
                    {results.graphql?.loginMutation?.reachable ? (
                      <Badge className="bg-blue-500">✓ Reachable</Badge>
                    ) : (
                      <Badge className="bg-red-500">✗ Unreachable</Badge>
                    )}
                  </div>
                  <div className="text-sm space-y-1 pl-4">
                    {results.graphql?.loginMutation?.error && (
                      <div className="text-red-500">Error: {results.graphql?.loginMutation?.error}</div>
                    )}
                    {results.graphql?.loginMutation?.errorMessage && (
                      <div className={results.graphql?.loginMutation?.expectedError ? 'text-green-600' : 'text-orange-600'}>
                        Response: {results.graphql?.loginMutation?.errorMessage}
                        {results.graphql?.loginMutation?.expectedError && ' (Expected - endpoint working!)'}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {!results.connectivity?.apiGateway?.ok && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded">
                    <strong>❌ API Gateway not reachable</strong>
                    <p className="mt-1">Make sure API Gateway is running on port 3002</p>
                    <code className="block mt-2 bg-white p-2 rounded">cd services/api-gateway && npm run start:dev</code>
                  </div>
                )}
                {!results.connectivity?.coreService?.ok && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded">
                    <strong>❌ Core Service not reachable</strong>
                    <p className="mt-1">Make sure Core Service is running on port 3005</p>
                    <code className="block mt-2 bg-white p-2 rounded">cd services/core-service && npm run start:dev</code>
                  </div>
                )}
                {results.connectivity?.apiGateway?.ok && results.connectivity?.coreService?.ok && results.graphql?.loginMutation?.expectedError && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded">
                    <strong>✅ All systems operational!</strong>
                    <p className="mt-1">Your services are configured correctly and login should work with valid credentials.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

