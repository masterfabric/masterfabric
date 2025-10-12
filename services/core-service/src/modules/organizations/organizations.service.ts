import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePostgresConnectionDto, UpdateRedisConnectionDto } from './dto/update-connection.dto';
import { ConnectionTestResult } from './dto/connection-test.dto';
import { Client } from 'pg';
import Redis from 'ioredis';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async getOrganizationStatus(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
        systemSettings: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllOrganizations() {
    return this.findAll();
  }

  async findByOrganizationId(organizationId: string) {
    // Return only the specific organization (as array for GraphQL query consistency)
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
        systemSettings: true, // Include system settings
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return [organization]; // Return as array for GraphQL
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    // Check if organization exists
    const existingOrg = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    // Check if slug is already taken by another organization
    if (updateOrganizationDto.slug !== existingOrg.slug) {
      const slugExists = await this.prisma.organization.findUnique({
        where: { slug: updateOrganizationDto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Slug is already taken');
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: updateOrganizationDto.name,
        slug: updateOrganizationDto.slug,
      },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Delete organization and all related data
    await this.prisma.$transaction(async (tx) => {
      // Delete all users in this organization
      await tx.user.deleteMany({
        where: { organizationId: id },
      });

      // Delete all projects in this organization
      await tx.project.deleteMany({
        where: { organizationId: id },
      });

      // Delete the organization itself
      await tx.organization.delete({
        where: { id },
      });
    });

    return organization;
  }

  async deleteOrganization(organizationId: string) {
    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Delete organization and all related data
    await this.prisma.$transaction(async (tx) => {
      // Delete all users in this organization
      await tx.user.deleteMany({
        where: { organizationId },
      });

      // Delete all projects in this organization
      await tx.project.deleteMany({
        where: { organizationId },
      });

      // Delete the organization itself
      await tx.organization.delete({
        where: { id: organizationId },
      });
    });

    return { message: 'Organization deleted successfully' };
  }

  // PostgreSQL Connection Management
  async updatePostgresConnection(
    organizationId: string,
    dto: UpdatePostgresConnectionDto,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        postgresHost: dto.postgresHost,
        postgresPort: dto.postgresPort,
        postgresDb: dto.postgresDb,
        postgresUser: dto.postgresUser,
        postgresPassword: dto.postgresPassword,
        postgresUpdatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
        systemSettings: true,
      },
    });
  }

  async testPostgresConnection(organizationId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      if (!organization.postgresHost || !organization.postgresDb || !organization.postgresUser) {
        return {
          success: false,
          message: 'PostgreSQL connection not configured',
          error: 'Missing required connection parameters',
        };
      }

      const client = new Client({
        host: organization.postgresHost,
        port: organization.postgresPort || 5432,
        database: organization.postgresDb,
        user: organization.postgresUser,
        password: organization.postgresPassword || undefined,
        connectionTimeoutMillis: 5000,
      });

      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: 'Successfully connected to PostgreSQL',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: 'Failed to connect to PostgreSQL',
        error: error.message,
        responseTime,
      };
    }
  }

  // Redis Connection Management
  async updateRedisConnection(
    organizationId: string,
    dto: UpdateRedisConnectionDto,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        redisHost: dto.redisHost,
        redisPort: dto.redisPort,
        redisPassword: dto.redisPassword,
        redisUpdatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
        systemSettings: true,
      },
    });
  }

  async testRedisConnection(organizationId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      if (!organization.redisHost) {
        return {
          success: false,
          message: 'Redis connection not configured',
          error: 'Missing required connection parameters',
        };
      }

      const redis = new Redis({
        host: organization.redisHost,
        port: organization.redisPort || 6379,
        password: organization.redisPassword || undefined,
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
      });

      await redis.ping();
      redis.disconnect();

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: 'Successfully connected to Redis',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: 'Failed to connect to Redis',
        error: error.message,
        responseTime,
      };
    }
  }
}
