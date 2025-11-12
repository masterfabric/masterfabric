import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectSchemasService } from '../project-schemas/project-schemas.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ProjectSchemasService))
    private readonly projectSchemasService: ProjectSchemasService,
  ) {}

  async create(organizationId: string, createProjectDto: CreateProjectDto) {
    // Create project for the organization
    const project = await this.prisma.project.create({
      data: {
        ...createProjectDto,
        organizationId,
        tenantDbUri: process.env.DATABASE_URL, // Same as core DB for multi-tenant
        redisUri: process.env.REDIS_URL,
      },
    });

    // Automatically create default "users" schema for the project
    try {
      await this.createDefaultUsersSchema(organizationId, project.id);
    } catch (error) {
      // Log error but don't fail project creation
      console.error('Failed to create default users schema:', error);
    }

    return project;
  }

  /**
   * Create default "users" schema for a new project
   * This is a structural schema that every project should have
   */
  private async createDefaultUsersSchema(organizationId: string, projectId: string) {
    const defaultUsersSchema = {
      tableName: 'users',
      displayName: 'Users',
      fields: [
        { name: 'email', type: 'string', required: true, unique: true },
        { name: 'password_hash', type: 'string', required: true },
        { name: 'first_name', type: 'string', required: false },
        { name: 'last_name', type: 'string', required: false },
        { name: 'phone', type: 'string', required: false },
        { name: 'avatar_url', type: 'string', required: false },
        { name: 'email_verified', type: 'boolean', required: false, default: false },
        { name: 'last_login', type: 'date', required: false },
        { name: 'metadata', type: 'json', required: false },
      ],
      enableRLS: true,
      policies: [],
      enableRealtime: false,
    };

    return this.projectSchemasService.create(organizationId, projectId, defaultUsersSchema);
  }

  async findAll(organizationId: string) {
    // Return only projects for this organization
    return this.prisma.project.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify project belongs to the user's organization
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async update(id: string, organizationId: string, updateProjectDto: UpdateProjectDto) {
    // First verify the project belongs to the organization
    const project = await this.findOne(id, organizationId);

    return this.prisma.project.update({
      where: { id: project.id },
      data: updateProjectDto,
    });
  }

  async remove(id: string, organizationId: string) {
    // First verify the project belongs to the organization
    const project = await this.findOne(id, organizationId);

    await this.prisma.project.delete({
      where: { id: project.id },
    });

    return project;
  }

  async getProjectCount(organizationId: string) {
    return this.prisma.project.count({
      where: {
        organizationId,
      },
    });
  }

  // API Keys Management
  async getApiKeys(projectId: string, organizationId: string) {
    // First verify the project belongs to the organization
    await this.findOne(projectId, organizationId);

    return this.prisma.apiKey.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createApiKey(projectId: string, organizationId: string, name: string) {
    // First verify the project belongs to the organization
    await this.findOne(projectId, organizationId);

    // Generate a random API key
    const apiKey = `mf_${this.generateRandomString(48)}`;

    return this.prisma.apiKey.create({
      data: {
        name,
        key: apiKey,
        projectId,
      },
    });
  }

  async deleteApiKey(keyId: string, organizationId: string) {
    // Find the API key and verify it belongs to a project in the organization
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
      include: { project: true },
    });

    if (!apiKey) {
      throw new ForbiddenException('API key not found');
    }

    if (apiKey.project.organizationId !== organizationId) {
      throw new ForbiddenException('API key does not belong to this organization');
    }

    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });

    return { message: 'API key deleted successfully' };
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

