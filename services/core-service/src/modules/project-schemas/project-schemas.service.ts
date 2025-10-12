import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectSchemaInput } from './dto/create-project-schema.dto';
import { UpdateProjectSchemaInput } from './dto/update-project-schema.dto';

@Injectable()
export class ProjectSchemasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new schema/table for a project
   */
  async create(organizationId: string, projectId: string, createDto: CreateProjectSchemaInput) {
    // Verify project belongs to organization
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Check if schema with this table name already exists
    const existingSchema = await this.prisma.projectSchema.findUnique({
      where: {
        projectId_tableName: {
          projectId,
          tableName: createDto.tableName,
        },
      },
    });

    if (existingSchema) {
      throw new BadRequestException(`Table '${createDto.tableName}' already exists in this project`);
    }

    // Validate field types
    this.validateFields(createDto.fields);

    // Create schema metadata
    const schema = await this.prisma.projectSchema.create({
      data: {
        projectId,
        tableName: createDto.tableName,
        displayName: createDto.displayName || createDto.tableName,
        fields: createDto.fields as any,
        enableRLS: createDto.enableRLS || false,
        policies: createDto.policies as any,
        enableRealtime: createDto.enableRealtime || false,
      },
    });

    // Create actual table in database
    await this.createPhysicalTable(projectId, createDto.tableName, createDto.fields);

    return schema;
  }

  /**
   * List all schemas for a project
   */
  async findAll(organizationId: string, projectId: string) {
    // Verify project belongs to organization
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return this.prisma.projectSchema.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific schema
   */
  async findOne(organizationId: string, projectId: string, schemaId: string) {
    // Verify project belongs to organization
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    const schema = await this.prisma.projectSchema.findFirst({
      where: {
        id: schemaId,
        projectId,
      },
    });

    if (!schema) {
      throw new NotFoundException('Schema not found');
    }

    return schema;
  }

  /**
   * Update schema metadata (not the physical table structure)
   */
  async update(organizationId: string, projectId: string, schemaId: string, updateDto: UpdateProjectSchemaInput) {
    // Verify project belongs to organization
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    const schema = await this.prisma.projectSchema.findFirst({
      where: {
        id: schemaId,
        projectId,
      },
    });

    if (!schema) {
      throw new NotFoundException('Schema not found');
    }

    // If fields are being updated, validate them
    if (updateDto.fields) {
      this.validateFields(updateDto.fields);
      
      // TODO: In production, implement ALTER TABLE logic to modify physical table
      // For now, we only update metadata
    }

    return this.prisma.projectSchema.update({
      where: { id: schemaId },
      data: {
        displayName: updateDto.displayName,
        fields: updateDto.fields as any,
        enableRLS: updateDto.enableRLS,
        policies: updateDto.policies as any,
        enableRealtime: updateDto.enableRealtime,
      },
    });
  }

  /**
   * Delete schema and its physical table
   */
  async remove(organizationId: string, projectId: string, schemaId: string) {
    // Verify project belongs to organization
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    const schema = await this.prisma.projectSchema.findFirst({
      where: {
        id: schemaId,
        projectId,
      },
    });

    if (!schema) {
      throw new NotFoundException('Schema not found');
    }

    // Drop physical table
    await this.dropPhysicalTable(projectId, schema.tableName);

    // Delete schema metadata
    await this.prisma.projectSchema.delete({
      where: { id: schemaId },
    });

    return schema;
  }

  /**
   * Validate field definitions
   */
  private validateFields(fields: any[]) {
    const validTypes = ['string', 'number', 'boolean', 'date', 'json', 'text', 'uuid'];
    const fieldNames = new Set<string>();

    for (const field of fields) {
      if (!field.name || typeof field.name !== 'string') {
        throw new BadRequestException('Each field must have a valid name');
      }

      if (fieldNames.has(field.name)) {
        throw new BadRequestException(`Duplicate field name: ${field.name}`);
      }

      fieldNames.add(field.name);

      if (!field.type || !validTypes.includes(field.type)) {
        throw new BadRequestException(
          `Field '${field.name}' has invalid type. Valid types: ${validTypes.join(', ')}`
        );
      }

      // Validate field name (alphanumeric + underscore, must start with letter)
      if (!/^[a-z][a-z0-9_]*$/i.test(field.name)) {
        throw new BadRequestException(
          `Field name '${field.name}' is invalid. Must start with a letter and contain only letters, numbers, and underscores`
        );
      }
    }
  }

  /**
   * Create physical table in database
   */
  private async createPhysicalTable(projectId: string, tableName: string, fields: any[]) {
    const columns = [
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
      `project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE`,
      'created_at TIMESTAMP DEFAULT NOW()',
      'updated_at TIMESTAMP DEFAULT NOW()',
    ];

    // Add user-defined fields
    for (const field of fields) {
      const sqlType = this.mapFieldTypeToSQL(field.type);
      let columnDef = `${field.name} ${sqlType}`;

      if (field.required) {
        columnDef += ' NOT NULL';
      }

      if (field.unique) {
        columnDef += ' UNIQUE';
      }

      if (field.default !== undefined) {
        columnDef += ` DEFAULT ${this.formatDefaultValue(field.default, field.type)}`;
      }

      columns.push(columnDef);
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS tenant_${tableName}_${projectId.replace(/-/g, '_')} (
        ${columns.join(',\n        ')}
      );
    `;

    await this.prisma.$executeRawUnsafe(createTableSQL);

    // Create index on project_id for performance
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_tenant_${tableName}_${projectId.replace(/-/g, '_')}_project_id 
      ON tenant_${tableName}_${projectId.replace(/-/g, '_')} (project_id);
    `);
  }

  /**
   * Drop physical table from database
   */
  private async dropPhysicalTable(projectId: string, tableName: string) {
    const dropTableSQL = `
      DROP TABLE IF EXISTS tenant_${tableName}_${projectId.replace(/-/g, '_')} CASCADE;
    `;

    await this.prisma.$executeRawUnsafe(dropTableSQL);
  }

  /**
   * Map field type to PostgreSQL type
   */
  private mapFieldTypeToSQL(fieldType: string): string {
    const typeMap: Record<string, string> = {
      string: 'VARCHAR(255)',
      text: 'TEXT',
      number: 'NUMERIC',
      boolean: 'BOOLEAN',
      date: 'TIMESTAMP',
      json: 'JSONB',
      uuid: 'UUID',
    };

    return typeMap[fieldType] || 'TEXT';
  }

  /**
   * Format default value for SQL
   */
  private formatDefaultValue(value: any, fieldType: string): string {
    if (value === null) {
      return 'NULL';
    }

    switch (fieldType) {
      case 'string':
      case 'text':
        return `'${value}'`;
      case 'number':
        return String(value);
      case 'boolean':
        return value ? 'true' : 'false';
      case 'date':
        return `'${value}'`;
      case 'json':
        return `'${JSON.stringify(value)}'`;
      default:
        return `'${value}'`;
    }
  }
}

