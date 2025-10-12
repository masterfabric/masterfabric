import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, createProjectDto: CreateProjectDto) {
    // Create project for the organization
    return this.prisma.project.create({
      data: {
        ...createProjectDto,
        organizationId,
        tenantDbUri: process.env.DATABASE_URL, // Same as core DB for multi-tenant
        redisUri: process.env.REDIS_URL,
      },
    });
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

