import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantDbProvider } from '../../core/db-context/tenant-db.provider';
import { CreateSchemaDto } from './dto/create-schema.dto';

@Injectable()
export class SchemaService {
  private readonly logger = new Logger(SchemaService.name);

  constructor(
    private prisma: PrismaService,
    private tenantDb: TenantDbProvider,
  ) {}

  async createTable(createSchemaDto: CreateSchemaDto): Promise<void> {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    const { tableName, fields } = createSchemaDto;

    this.logger.log(`Creating table ${tableName} for organization ${orgId}`);

    // Build the CREATE TABLE SQL
    const columns = [
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
      'organization_id UUID NOT NULL DEFAULT $1',
      'created_at TIMESTAMP DEFAULT NOW()',
      'updated_at TIMESTAMP DEFAULT NOW()',
    ];

    // Add user-defined fields
    fields.forEach(field => {
      const sqlType = this.mapGraphQLTypeToSQL(field.type);
      columns.push(`${field.name} ${sqlType}`);
    });

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName}_${orgId} (
        ${columns.join(',\n        ')}
      );
    `;

    // Create the table
    await this.tenantDb.getClient().$executeRawUnsafe(createTableSQL, orgId);

    // Create indexes
    await this.tenantDb.getClient().$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_${orgId}_org_id 
      ON ${tableName}_${orgId} (organization_id);
    `);

    // Store schema definition in Core DB
    await this.prisma.schemaDefinition.upsert({
      where: {
        organizationId_tableName: {
          organizationId: orgId,
          tableName: tableName,
        },
      },
      update: {
        schemaJson: fields as any,
      },
      create: {
        organizationId: orgId,
        tableName: tableName,
        schemaJson: fields as any,
      },
    });

    this.logger.log(`Successfully created table ${tableName} for organization ${orgId}`);
  }

  private mapGraphQLTypeToSQL(graphqlType: string): string {
    switch (graphqlType.toLowerCase()) {
      case 'string':
        return 'VARCHAR';
      case 'int':
        return 'INTEGER';
      case 'float':
        return 'DECIMAL';
      case 'boolean':
        return 'BOOLEAN';
      case 'datetime':
        return 'TIMESTAMP';
      default:
        return 'VARCHAR';
    }
  }

  async getSchemaDefinitions(organizationId: string) {
    return this.prisma.schemaDefinition.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
