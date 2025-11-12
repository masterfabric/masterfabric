'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { apolloClient } from '@/lib/graphql';

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
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      let parsedVariables: any = {};
      if (variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch (e) {
          setError('Invalid JSON in variables');
          setLoading(false);
          return;
        }
      }

      // Execute raw GraphQL query/mutation
      const isMutation = queryText.trim().toLowerCase().startsWith('mutation');
      
      if (isMutation) {
        const result = await apolloClient.mutate({
          mutation: gql(queryText),
          variables: parsedVariables,
        });
        setResponse(result.data);
      } else {
        const result = await apolloClient.query({
          query: gql(queryText),
          variables: parsedVariables,
        });
        setResponse(result.data);
      }
    } catch (err: any) {
      console.error('GraphQL Error:', err);
      setError(err.message || 'An error occurred');
      if (err.graphQLErrors && err.graphQLErrors.length > 0) {
        setError(err.graphQLErrors[0].message);
      }
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
              className="w-full h-48 px-3 py-2 border rounded-md font-mono text-sm"
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
              className="w-full h-32 px-3 py-2 border rounded-md font-mono text-sm"
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

          {/* Schema Info */}
          <div className="mt-6 p-4 bg-muted rounded-md">
            <h3 className="text-sm font-medium mb-2">Schema Fields</h3>
            <div className="space-y-1">
              {schema.fields.map((field: any, idx: number) => (
                <div key={idx} className="text-xs">
                  <code className="bg-background px-1 py-0.5 rounded">{field.name}</code>
                  <span className="text-muted-foreground ml-2">: {field.type}</span>
                  {field.required && <span className="text-muted-foreground ml-1">(required)</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

