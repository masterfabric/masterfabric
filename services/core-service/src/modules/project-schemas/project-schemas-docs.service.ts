import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectSchemasDocsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate API documentation for a schema
   */
  async generateSchemaDocs(organizationId: string, projectId: string, schemaId: string) {
    const schema = await this.prisma.projectSchema.findFirst({
      where: {
        id: schemaId,
        projectId,
        project: { organizationId },
      },
    });

    if (!schema) {
      throw new Error('Schema not found');
    }

    const fields = schema.fields as any[];
    const tableName = schema.tableName;
    const displayName = schema.displayName || tableName;

    // Generate GraphQL query example
    const queryExample = this.generateQueryExample(tableName, fields);
    const mutationExamples = this.generateMutationExamples(tableName, fields);

    // Generate cURL examples
    const curlExamples = this.generateCurlExamples(tableName, fields, projectId);

    // Generate TypeScript/JavaScript client examples
    const clientExamples = this.generateClientExamples(tableName, fields, projectId);

    return {
      schema: {
        id: schema.id,
        tableName,
        displayName,
        fields,
        requireAuth: schema.requireAuth,
        rateLimit: schema.rateLimit,
        enableRLS: schema.enableRLS,
        enableRealtime: schema.enableRealtime,
      },
      graphql: {
        query: queryExample,
        mutations: mutationExamples,
      },
      curl: curlExamples,
      clients: clientExamples,
      metadata: {
        createdAt: schema.createdAt,
        updatedAt: schema.updatedAt,
        queryCount: schema.queryCount,
        lastQueryAt: schema.lastQueryAt,
      },
    };
  }

  private generateQueryExample(tableName: string, fields: any[]) {
    const fieldNames = fields.map(f => f.name).join('\n      ');
    
    return `query Query${this.capitalize(tableName)}($projectId: String!, $input: QuerySchemaDataInput!) {
  querySchemaData(projectId: $projectId, input: $input) {
    ${fieldNames}
    id
    project_id
    created_at
    updated_at
  }
}`;
  }

  private generateMutationExamples(tableName: string, fields: any[]) {
    const createFields = fields
      .filter(f => !['id', 'project_id', 'created_at', 'updated_at'].includes(f.name))
      .map(f => `    ${f.name}: $${f.name}`)
      .join('\n');

    const updateFields = fields
      .filter(f => !['id', 'project_id', 'created_at', 'updated_at'].includes(f.name))
      .map(f => `    ${f.name}: $${f.name}`)
      .join('\n');

    return {
      create: `mutation Create${this.capitalize(tableName)}($projectId: String!, $input: CreateSchemaDataInput!) {
  createSchemaData(projectId: $projectId, input: $input) {
    id
    ${fields.map(f => f.name).join('\n    ')}
  }
}`,
      update: `mutation Update${this.capitalize(tableName)}($projectId: String!, $input: UpdateSchemaDataInput!) {
  updateSchemaData(projectId: $projectId, input: $input) {
    id
    ${fields.map(f => f.name).join('\n    ')}
  }
}`,
      delete: `mutation Delete${this.capitalize(tableName)}($projectId: String!, $input: DeleteSchemaDataInput!) {
  deleteSchemaData(projectId: $projectId, input: $input) {
    id
  }
}`,
    };
  }

  private generateCurlExamples(tableName: string, fields: any[], projectId: string) {
    const sampleData: any = {};
    fields
      .filter(f => !['id', 'project_id', 'created_at', 'updated_at'].includes(f.name))
      .forEach(field => {
        switch (field.type) {
          case 'string':
          case 'text':
            sampleData[field.name] = `"sample_${field.name}"`;
            break;
          case 'number':
            sampleData[field.name] = 0;
            break;
          case 'boolean':
            sampleData[field.name] = false;
            break;
          case 'date':
            sampleData[field.name] = `"${new Date().toISOString()}"`;
            break;
          case 'json':
            sampleData[field.name] = '{}';
            break;
        }
      });

    return {
      query: `curl -X POST http://localhost:3002/graphql \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "query": "query QuerySchemaData(\\$projectId: String!, \\$input: QuerySchemaDataInput!) { querySchemaData(projectId: \\$projectId, input: \\$input) }",
    "variables": {
      "projectId": "${projectId}",
      "input": {
        "tableName": "${tableName}",
        "limit": 10
      }
    }
  }'`,
      create: `curl -X POST http://localhost:3002/graphql \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "query": "mutation CreateSchemaData(\\$projectId: String!, \\$input: CreateSchemaDataInput!) { createSchemaData(projectId: \\$projectId, input: \\$input) }",
    "variables": {
      "projectId": "${projectId}",
      "input": {
        "tableName": "${tableName}",
        "data": ${JSON.stringify(sampleData, null, 8)}
      }
    }
  }'`,
    };
  }

  private generateClientExamples(tableName: string, fields: any[], projectId: string) {
    const sampleData: any = {};
    fields
      .filter(f => !['id', 'project_id', 'created_at', 'updated_at'].includes(f.name))
      .forEach(field => {
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
        }
      });

    return {
      javascript: `// Using Apollo Client
import { gql, useQuery, useMutation } from '@apollo/client';

const QUERY_${tableName.toUpperCase()} = gql\`
  query QuerySchemaData($projectId: String!, $input: QuerySchemaDataInput!) {
    querySchemaData(projectId: $projectId, input: $input)
  }
\`;

const CREATE_${tableName.toUpperCase()} = gql\`
  mutation CreateSchemaData($projectId: String!, $input: CreateSchemaDataInput!) {
    createSchemaData(projectId: $projectId, input: $input)
  }
\`;

// Query
const { data, loading } = useQuery(QUERY_${tableName.toUpperCase()}, {
  variables: {
    projectId: "${projectId}",
    input: {
      tableName: "${tableName}",
      limit: 10
    }
  }
});

// Create
const [create${this.capitalize(tableName)}] = useMutation(CREATE_${tableName.toUpperCase()});
await create${this.capitalize(tableName)}({
  variables: {
    projectId: "${projectId}",
    input: {
      tableName: "${tableName}",
      data: ${JSON.stringify(sampleData, null, 6)}
    }
  }
});`,
      typescript: `// TypeScript types
interface ${this.capitalize(tableName)} {
${fields.map(f => `  ${f.name}: ${this.getTypeScriptType(f.type)};`).join('\n')}
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

// Using fetch API
const query${this.capitalize(tableName)} = async (token: string) => {
  const response = await fetch('http://localhost:3002/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${token}\`
    },
    body: JSON.stringify({
      query: \`query QuerySchemaData($projectId: String!, $input: QuerySchemaDataInput!) {
        querySchemaData(projectId: $projectId, input: $input)
      }\`,
      variables: {
        projectId: "${projectId}",
        input: {
          tableName: "${tableName}",
          limit: 10
        }
      }
    })
  });
  return response.json();
};`,
    };
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getTypeScriptType(fieldType: string): string {
    switch (fieldType) {
      case 'string':
      case 'text':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'string'; // ISO date string
      case 'json':
        return 'any';
      default:
        return 'any';
    }
  }
}

