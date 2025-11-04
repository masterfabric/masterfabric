import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('PROVISIONING_SERVICE') private provisioningClient: ClientProxy,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, organizationName, organizationSlug } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if organization slug is already taken
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: organizationSlug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization slug is already taken');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create organization and user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug,
          status: 'PROVISIONING',
        },
      });

      // Create default system settings for the organization
      await tx.systemSettings.create({
        data: {
          organizationId: organization.id,
          apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3002',
          apiGatewayStatus: 'ACTIVE',
          provisioningUrl: process.env.PROVISIONING_SERVICE_URL || 'http://localhost:3003',
          provisioningStatus: 'ACTIVE',
          tenantRuntimeUrl: process.env.TENANT_RUNTIME_URL || 'http://localhost:3004',
          tenantRuntimeStatus: 'ACTIVE',
          defaultDbHost: process.env.DEFAULT_DB_HOST || 'localhost',
          defaultDbPort: parseInt(process.env.DEFAULT_DB_PORT || '5432'),
          defaultRedisHost: process.env.DEFAULT_REDIS_HOST || 'localhost',
          defaultRedisPort: parseInt(process.env.DEFAULT_REDIS_PORT || '6379'),
          healthCheckInterval: 10,
          healthCheckEnabled: true,
          notifyOnServiceDown: true,
          notifyOnHighLatency: true,
          latencyThresholdMs: 300,
        },
      });

      // Create user (first user in organization becomes OWNER)
      // Check if this is the first user in the organization
      const userCount = await tx.user.count({
        where: { organizationId: organization.id },
      });
      
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: userCount === 0 ? 'OWNER' : 'CUSTOMER', // First user is OWNER, others are CUSTOMER
          organizationId: organization.id,
        },
        include: {
          organization: true,
        },
      });

      return { user, organization };
    });

    // Send provisioning request to queue
    this.provisioningClient.emit('ORG_CREATE_REQUEST', {
      organizationId: result.organization.id,
      slug: organizationSlug,
    });

    // Generate JWT
    const payload: JwtPayload = {
      sub: result.user.id,
      email: result.user.email,
      organizationId: result.user.organizationId,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
        organizationSlug: result.organization.slug,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user with organization
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationSlug: user.organization.slug,
      },
    };
  }

  async getDeveloperAccessibleProjects(organizationId: string) {
    // Return all projects for the organization that developers can access
    return this.prisma.project.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
