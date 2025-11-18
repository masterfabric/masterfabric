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

    // Ensure fields are in array format
    const normalizedFields = Array.isArray(createDto.fields) 
      ? createDto.fields 
      : this.normalizeFields(createDto.fields);

    // Validate field types
    this.validateFields(normalizedFields);

    // Create schema metadata
    const schema = await this.prisma.projectSchema.create({
      data: {
        projectId,
        tableName: createDto.tableName,
        displayName: createDto.displayName || createDto.tableName,
        fields: normalizedFields as any,
        enableRLS: createDto.enableRLS || false,
        policies: createDto.policies as any,
        enableRealtime: createDto.enableRealtime || false,
        requireAuth: createDto.requireAuth !== undefined ? createDto.requireAuth : true,
        rateLimit: createDto.rateLimit || null,
        metadata: createDto.metadata as any || null,
        queryCount: 0,
      } as any,
    });

    // Create actual table in database
    await this.createPhysicalTable(projectId, createDto.tableName, normalizedFields);

    // Return schema with normalized fields
    return {
      ...schema,
      fields: this.normalizeFields(schema.fields),
    };
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

    const schemas = await this.prisma.projectSchema.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    // Ensure fields are properly formatted as arrays
    return schemas.map(schema => ({
      ...schema,
      fields: this.normalizeFields(schema.fields),
    }));
  }

  /**
   * Normalize fields to ensure they're always in array format
   */
  private normalizeFields(fields: any): any[] {
    if (!fields) {
      return [];
    }

    // If already an array, return as-is
    if (Array.isArray(fields)) {
      return fields;
    }

    // If it's a string, try to parse it
    if (typeof fields === 'string') {
      try {
        const parsed = JSON.parse(fields);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // If parsed is an object, convert to array
        if (typeof parsed === 'object' && parsed !== null) {
          return Object.entries(parsed).map(([name, field]: [string, any]) => ({
            name,
            type: typeof field === 'string' ? field : (field?.type || 'string'),
            required: field?.required || false,
            unique: field?.unique || false,
            default: field?.default,
          }));
        }
      } catch (e) {
        console.error('Failed to parse fields JSON:', e);
        return [];
      }
    }

    // If it's an object, convert to array format
    if (typeof fields === 'object' && fields !== null && !Array.isArray(fields)) {
      return Object.entries(fields).map(([name, field]: [string, any]) => ({
        name,
        type: typeof field === 'string' ? field : (field?.type || 'string'),
        required: field?.required || false,
        unique: field?.unique || false,
        default: field?.default,
      }));
    }

    return [];
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

    // Ensure fields are properly formatted as arrays
    return {
      ...schema,
      fields: this.normalizeFields(schema.fields),
    };
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

    // If fields are being updated, normalize and validate them
    let normalizedFields = updateDto.fields;
    if (updateDto.fields) {
      normalizedFields = Array.isArray(updateDto.fields) 
        ? updateDto.fields 
        : this.normalizeFields(updateDto.fields);
      this.validateFields(normalizedFields);
      
      // TODO: In production, implement ALTER TABLE logic to modify physical table
      // For now, we only update metadata
    }

    const updatedSchema = await this.prisma.projectSchema.update({
      where: { id: schemaId },
      data: {
        displayName: updateDto.displayName,
        fields: normalizedFields as any,
        enableRLS: updateDto.enableRLS,
        policies: updateDto.policies as any,
        enableRealtime: updateDto.enableRealtime,
        requireAuth: updateDto.requireAuth,
        rateLimit: updateDto.rateLimit,
        metadata: updateDto.metadata as any,
      } as any,
    });

    // Return schema with normalized fields
    return {
      ...updatedSchema,
      fields: this.normalizeFields(updatedSchema.fields),
    };
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
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    const validTypes = ['string', 'number', 'boolean', 'date', 'json', 'text', 'uuid'];
    const fieldNames = new Set<string>();

    for (const field of fields) {
      if (!field || typeof field !== 'object') {
        throw new BadRequestException('Each field must be a valid object');
      }

      if (!field.name || typeof field.name !== 'string' || !field.name.trim()) {
        throw new BadRequestException('Each field must have a valid, non-empty name');
      }

      const fieldName = field.name.trim().toLowerCase();

      if (fieldNames.has(fieldName)) {
        throw new BadRequestException(`Duplicate field name: ${field.name}`);
      }

      fieldNames.add(fieldName);

      if (!field.type || typeof field.type !== 'string' || !validTypes.includes(field.type)) {
        throw new BadRequestException(
          `Field '${field.name}' has invalid type '${field.type}'. Valid types: ${validTypes.join(', ')}`
        );
      }

      // Validate field name (alphanumeric + underscore, must start with letter, lowercase only)
      if (!/^[a-z][a-z0-9_]*$/.test(fieldName)) {
        throw new BadRequestException(
          `Field name '${field.name}' is invalid. Must start with a lowercase letter and contain only lowercase letters, numbers, and underscores`
        );
      }
    }
  }

  /**
   * Create physical table in database
   */
  private async createPhysicalTable(projectId: string, tableName: string, fields: any[]) {
    const sanitizedTableName = `tenant_${tableName}_${projectId.replace(/-/g, '_')}`;
    
    // Check if table already exists
    const tableExists = await this.prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${sanitizedTableName}'
      ) as exists;
    `);

    if (Array.isArray(tableExists) && (tableExists[0] as any)?.exists) {
      throw new BadRequestException(`Table '${tableName}' already exists in database`);
    }

    const columns = [
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
      'project_id UUID NOT NULL',
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

    // Create table first
    const createTableSQL = `
      CREATE TABLE ${sanitizedTableName} (
        ${columns.join(',\n        ')}
      );
    `;

    await this.prisma.$executeRawUnsafe(createTableSQL);

    // Add foreign key constraint separately
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE ${sanitizedTableName}
        ADD CONSTRAINT ${sanitizedTableName}_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
      `);
    } catch (error: any) {
      // If foreign key fails, drop the table and rethrow
      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${sanitizedTableName};`);
      throw new BadRequestException(`Failed to create table: ${error.message}`);
    }

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

  /**
   * Query data from a schema table
   */
  async queryData(organizationId: string, projectId: string, tableName: string, options?: {
    where?: any;
    orderBy?: any;
    limit?: number;
    offset?: number;
  }) {
    // Verify schema exists
    const schema = await this.prisma.projectSchema.findFirst({
      where: {
        projectId,
        tableName,
        project: { organizationId },
      },
    });

    if (!schema) {
      throw new NotFoundException(`Schema '${tableName}' not found in this project`);
    }

    const sanitizedTableName = `tenant_${tableName}_${projectId.replace(/-/g, '_')}`;
    const params: any[] = [projectId];
    let paramIndex = 1;
    
    let query = `SELECT * FROM ${sanitizedTableName} WHERE project_id = $1`;

    // Add WHERE conditions
    if (options?.where) {
      const { whereClause, whereParams } = this.buildWhereClause(options.where, paramIndex);
      if (whereClause) {
        query += ` AND ${whereClause}`;
        params.push(...whereParams);
        paramIndex += whereParams.length;
      }
    }

    // Add ORDER BY
    if (options?.orderBy) {
      const orderBy = this.buildOrderByClause(options.orderBy);
      if (orderBy) {
        query += ` ${orderBy}`;
      }
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    // Add LIMIT and OFFSET
    if (options?.limit) {
      paramIndex++;
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
    }
    if (options?.offset) {
      paramIndex++;
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await this.prisma.$queryRawUnsafe(query, ...params);
    
    // Update query statistics
    await this.incrementQueryCount(organizationId, projectId, tableName);
    
    return Array.isArray(result) ? result : [];
  }

  /**
   * Create data in a schema table
   */
  async createData(organizationId: string, projectId: string, tableName: string, data: any) {
    // Verify schema exists
    const schema = await this.prisma.projectSchema.findFirst({
      where: {
        projectId,
        tableName,
        project: { organizationId },
      },
    });

    if (!schema) {
      throw new NotFoundException(`Schema '${tableName}' not found in this project`);
    }

    const sanitizedTableName = `tenant_${tableName}_${projectId.replace(/-/g, '_')}`;
    const fields = schema.fields as any[];
    const fieldNames = fields.map(f => f.name);

    // Validate and filter data based on schema fields
    const validData: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Validate column name
      if (!/^[a-z][a-z0-9_]*$/i.test(key)) {
        throw new BadRequestException(`Invalid field name: ${key}`);
      }
      
      // Check if field exists in schema
      if (!fieldNames.includes(key)) {
        throw new BadRequestException(`Field '${key}' does not exist in schema '${tableName}'`);
      }
      
      validData[key] = value;
    }

    // Build INSERT query with parameterized values
    const columns = ['project_id', ...Object.keys(validData)];
    const values = [projectId, ...Object.values(validData)];
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');

    const query = `
      INSERT INTO ${sanitizedTableName} (${columnNames}, created_at, updated_at)
      VALUES (${placeholders}, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.prisma.$executeRawUnsafe(query, ...values);
    
    // Update query statistics
    await this.incrementQueryCount(organizationId, projectId, tableName);
    
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * Update data in a schema table
   */
  async updateData(organizationId: string, projectId: string, tableName: string, id: string, data: any) {
    // Verify schema exists
    const schema = await this.prisma.projectSchema.findFirst({
      where: {
        projectId,
        tableName,
        project: { organizationId },
      },
    });

    if (!schema) {
      throw new NotFoundException(`Schema '${tableName}' not found in this project`);
    }

    const sanitizedTableName = `tenant_${tableName}_${projectId.replace(/-/g, '_')}`;
    const fields = schema.fields as any[];
    const fieldNames = fields.map(f => f.name);

    // Validate and filter data based on schema fields
    const validData: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Validate column name
      if (!/^[a-z][a-z0-9_]*$/i.test(key)) {
        throw new BadRequestException(`Invalid field name: ${key}`);
      }
      
      // Check if field exists in schema
      if (!fieldNames.includes(key)) {
        throw new BadRequestException(`Field '${key}' does not exist in schema '${tableName}'`);
      }
      
      validData[key] = value;
    }

    if (Object.keys(validData).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }
    
    // Build UPDATE query with parameterized values
    const updates = Object.keys(validData).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(validData);

    const query = `
      UPDATE ${sanitizedTableName}
      SET ${updates}, updated_at = NOW()
      WHERE id = $${values.length + 1} AND project_id = $${values.length + 2}
      RETURNING *
    `;

    const result = await this.prisma.$executeRawUnsafe(query, ...values, id, projectId);
    
    // Update query statistics
    await this.incrementQueryCount(organizationId, projectId, tableName);
    
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * Delete data from a schema table
   */
  async deleteData(organizationId: string, projectId: string, tableName: string, id: string) {
    // Verify schema exists
    const schema = await this.prisma.projectSchema.findFirst({
      where: {
        projectId,
        tableName,
        project: { organizationId },
      },
    });

    if (!schema) {
      throw new NotFoundException(`Schema '${tableName}' not found in this project`);
    }

    const sanitizedTableName = `tenant_${tableName}_${projectId.replace(/-/g, '_')}`;

    const query = `
      DELETE FROM ${sanitizedTableName}
      WHERE id = $1 AND project_id = $2
      RETURNING *
    `;

    const result = await this.prisma.$executeRawUnsafe(query, id, projectId);
    
    // Update query statistics
    await this.incrementQueryCount(organizationId, projectId, tableName);
    
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * Build WHERE clause from JSON object (parameterized)
   */
  private buildWhereClause(where: any, startParamIndex: number = 1): { whereClause: string; whereParams: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = startParamIndex;
    
    for (const [key, value] of Object.entries(where)) {
      // Validate column name (prevent SQL injection)
      if (!/^[a-z][a-z0-9_]*$/i.test(key)) {
        throw new BadRequestException(`Invalid column name: ${key}`);
      }

      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else {
        paramIndex++;
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
      }
    }

    return {
      whereClause: conditions.join(' AND '),
      whereParams: params,
    };
  }

  /**
   * Increment query count and update last query time
   */
  private async incrementQueryCount(organizationId: string, projectId: string, tableName: string) {
    try {
      await this.prisma.projectSchema.updateMany({
        where: {
          projectId,
          tableName,
          project: { organizationId },
        },
        data: {
          queryCount: { increment: 1 },
          lastQueryAt: new Date(),
        } as any,
      });
    } catch (error) {
      // Silently fail - statistics update shouldn't break the query
      console.error('Failed to update query statistics:', error);
    }
  }

  /**
   * Build ORDER BY clause from JSON object
   */
  private buildOrderByClause(orderBy: any): string {
    const orders: string[] = [];
    
    for (const [key, direction] of Object.entries(orderBy)) {
      // Validate column name (prevent SQL injection)
      if (!/^[a-z][a-z0-9_]*$/i.test(key)) {
        throw new BadRequestException(`Invalid column name for ORDER BY: ${key}`);
      }
      
      const dir = direction === 'desc' || direction === 'DESC' ? 'DESC' : 'ASC';
      orders.push(`${key} ${dir}`);
    }

    return orders.length > 0 ? `ORDER BY ${orders.join(', ')}` : '';
  }
}

