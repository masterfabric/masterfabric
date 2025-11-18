'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { apolloClient } from '@/lib/graphql';
import { useToast } from '@/components/ui/toast';

interface SchemaTestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  schema: {
    id: string;
    tableName: string;
    displayName?: string;
    fields: any[];
  };
}

type QueryType = 'query' | 'mutation';

export function SchemaTestDrawer({ isOpen, onClose, projectId, schema }: SchemaTestDrawerProps) {
  const [queryType, setQueryType] = useState<QueryType>('query');
  const [queryText, setQueryText] = useState('');
  const [variables, setVariables] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestLogs, setRequestLogs] = useState<Array<{timestamp: string; type: 'request' | 'response' | 'error'; data: any}>>([]);
  const toast = useToast();

  // Generate example queries based on schema
  const generateExampleQuery = () => {
    const tableName = schema.tableName;
    const query = `query QuerySchemaData($projectId: String!, $input: QuerySchemaDataInput!) {
  querySchemaData(projectId: $projectId, input: $input)
}`;
    const vars = {
      projectId,
      input: {
        tableName,
        limit: 10
      }
    };
    return { query, vars };
  };

  const generateExampleMutation = () => {
    const tableName = schema.tableName;
    const sampleData: any = {};
    
    // Generate sample data based on schema fields (skip system fields)
    const systemFields = ['id', 'project_id', 'created_at', 'updated_at'];
    schema.fields.forEach((field: any) => {
      if (systemFields.includes(field.name)) return;
      
      switch (field.type) {
        case 'string':
        case 'text':
          sampleData[field.name] = `sample_${field.name}`;
          break;
        case 'number':
          sampleData[field.name] = 0;
          break;
        case 'boolean':
          sampleData[field.name] = false;
          break;
        case 'date':
          sampleData[field.name] = new Date().toISOString();
          break;
        case 'json':
          sampleData[field.name] = {};
          break;
        default:
          sampleData[field.name] = `sample`;
      }
    });

    const mutation = `mutation CreateSchemaData($projectId: String!, $input: CreateSchemaDataInput!) {
  createSchemaData(projectId: $projectId, input: $input)
}`;
    const vars = {
      projectId,
      input: {
        tableName,
        data: sampleData
      }
    };
    return { query: mutation, vars };
  };

  const handleLoadExample = () => {
    if (queryType === 'query') {
      const { query, vars } = generateExampleQuery();
      setQueryText(query);
      setVariables(JSON.stringify(vars, null, 2));
    } else {
      const { query, vars } = generateExampleMutation();
      setQueryText(query);
      setVariables(JSON.stringify(vars, null, 2));
    }
  };

  const handleExecuteRaw = async () => {
    if (!queryText.trim()) {
      setError('Please enter a query or mutation');
      toast.showError('Validation Error', 'Please enter a query or mutation');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    const timestamp = new Date().toISOString();

    try {
      let parsedVariables: any = {};
      if (variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch (e) {
          const errorMsg = 'Invalid JSON in variables';
          setError(errorMsg);
          setRequestLogs(prev => [...prev, {
            timestamp,
            type: 'error',
            data: { message: errorMsg, details: e instanceof Error ? e.message : 'Unknown error' }
          }]);
          toast.showError('Invalid JSON', 'Please check your variables JSON syntax');
          setLoading(false);
          return;
        }
      }

      // Log request
      const requestLog = {
        timestamp,
        type: 'request' as const,
        data: {
          query: queryText,
          variables: parsedVariables,
          type: queryType
        }
      };
      setRequestLogs(prev => [...prev, requestLog]);
      console.log('GraphQL Request:', requestLog);

      // Execute raw GraphQL query/mutation
      const isMutation = queryText.trim().toLowerCase().startsWith('mutation');
      
      let result: any;
      if (isMutation) {
        result = await apolloClient.mutate({
          mutation: gql(queryText),
          variables: parsedVariables,
        });
      } else {
        result = await apolloClient.query({
          query: gql(queryText),
          variables: parsedVariables,
        });
      }

      // Log response
      const responseLog = {
        timestamp: new Date().toISOString(),
        type: 'response' as const,
        data: result.data
      };
      setRequestLogs(prev => [...prev, responseLog]);
      console.log('GraphQL Response:', responseLog);
      
      setResponse(result.data);
      toast.showSuccess('Query executed', 'GraphQL query executed successfully');
    } catch (err: any) {
      console.error('GraphQL Error:', err);
      
      const errorDetails = {
        message: err.message || 'An error occurred',
        graphQLErrors: err.graphQLErrors || [],
        networkError: err.networkError ? {
          message: err.networkError.message,
          statusCode: err.networkError.statusCode
        } : null,
        stack: err.stack
      };

      const errorMessage = err.graphQLErrors && err.graphQLErrors.length > 0
        ? err.graphQLErrors[0].message
        : err.message || 'An error occurred';

      setError(errorMessage);
      
      // Log error
      const errorLog = {
        timestamp: new Date().toISOString(),
        type: 'error' as const,
        data: errorDetails
      };
      setRequestLogs(prev => [...prev, errorLog]);
      console.error('GraphQL Error Details:', errorLog);
      
      toast.showError('Query failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Test Schema: {schema.displayName || schema.tableName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Test GraphQL queries and mutations for this schema
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Query Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={queryType === 'query' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQueryType('query')}
            >
              Query
            </Button>
            <Button
              variant={queryType === 'mutation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQueryType('mutation')}
            >
              Mutation
            </Button>
            <Button variant="outline" size="sm" onClick={handleLoadExample}>
              Load Example
            </Button>
          </div>

          {/* Query Editor */}
          <div>
            <label className="block text-sm font-medium mb-2">
              GraphQL {queryType === 'query' ? 'Query' : 'Mutation'}
            </label>
            <textarea
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={`Enter your ${queryType} here...`}
              className="w-full h-48 px-3 py-2 border rounded-md font-mono text-sm bg-background text-foreground"
            />
          </div>

          {/* Variables Editor */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Variables (JSON)
            </label>
            <textarea
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              placeholder='{"input": {"tableName": "users", "limit": 10}}'
              className="w-full h-32 px-3 py-2 border rounded-md font-mono text-sm bg-background text-foreground"
            />
          </div>

          {/* Execute Button */}
          <div className="flex gap-2">
            <Button onClick={handleExecuteRaw} disabled={loading}>
              {loading ? 'Executing...' : 'Execute Query'}
            </Button>
            <Button variant="outline" onClick={() => {
              setQueryText('');
              setVariables('');
              setResponse(null);
              setError(null);
            }}>
              Clear
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive font-medium">Error:</p>
              <pre className="text-xs mt-2 overflow-auto">{error}</pre>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div>
              <label className="block text-sm font-medium mb-2">Response</label>
              <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-96">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}

          {/* Request Logs */}
          {requestLogs.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Request Logs</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRequestLogs([])}
                >
                  Clear Logs
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {requestLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-md text-xs font-mono ${
                      log.type === 'error'
                        ? 'bg-destructive/10 border border-destructive/20'
                        : log.type === 'response'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-muted border border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${
                        log.type === 'error' ? 'text-destructive' : 
                        log.type === 'response' ? 'text-green-600 dark:text-green-400' : 
                        'text-foreground'
                      }`}>
                        {log.type === 'request' ? '→ Request' : log.type === 'response' ? '← Response' : '✕ Error'}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-[10px] overflow-auto mt-1">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schema Info */}
          <div className="mt-6 p-4 bg-muted rounded-md">
            <h3 className="text-sm font-medium mb-2">Schema Fields</h3>
            <div className="flex flex-wrap gap-1.5 max-w-full">
              {(() => {
                // Handle different field formats (array or object)
                let fieldsArray: any[] = [];
                if (Array.isArray(schema.fields)) {
                  fieldsArray = schema.fields;
                } else if (schema.fields && typeof schema.fields === 'object') {
                  // Convert object to array
                  fieldsArray = Object.entries(schema.fields).map(([name, field]: [string, any]) => ({
                    name,
                    type: typeof field === 'string' ? field : field?.type || 'string',
                    required: field?.required || false,
                    unique: field?.unique || false,
                  }));
                }
                
                return fieldsArray.length > 0 ? (
                  fieldsArray.map((field: any, idx: number) => (
                    <div key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-background rounded border border-border/50 shrink-0">
                      <code className="text-xs font-medium text-foreground whitespace-nowrap">{field.name || 'unnamed'}</code>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">: {field.type || 'string'}</span>
                      {field.required && <span className="text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">req</span>}
                      {field.unique && <span className="text-xs text-green-600 dark:text-green-400 whitespace-nowrap">uniq</span>}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No fields defined</span>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

