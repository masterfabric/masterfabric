import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterTenantUserInput } from './dto/register-tenant-user.dto';
import { LoginTenantUserInput } from './dto/login-tenant-user.dto';

@Injectable()
export class TenantUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new tenant user for a project
   */
  async register(projectId: string, registerDto: RegisterTenantUserInput) {
    // Check if project exists and has auth enabled
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.authEnabled) {
      throw new ForbiddenException('Authentication is disabled for this project');
    }

    if (!project.allowSignup) {
      throw new ForbiddenException('Sign up is disabled for this project');
    }

    // Check if user already exists
    const existingUser = await this.prisma.tenantUser.findUnique({
      where: {
        projectId_email: {
          projectId,
          email: registerDto.email,
        },
      },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists in this project');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.tenantUser.create({
      data: {
        projectId,
        email: registerDto.email,
        passwordHash,
        provider: 'email',
        metadata: registerDto.metadata,
        emailConfirmed: false, // In production, send confirmation email
      },
    });

    // Generate JWT token using project-specific secret
    const jwtSecret = project.jwtSecret || process.env.JWT_SECRET;
    const access_token = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        projectId: project.id,
        type: 'tenant',
      },
      {
        secret: jwtSecret,
        expiresIn: project.jwtExpiresIn || '7d',
      },
    );

    return {
      access_token,
      user: this.sanitizeUser(user),
      projectId: project.id,
    };
  }

  /**
   * Login tenant user
   */
  async login(projectId: string, loginDto: LoginTenantUserInput) {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.authEnabled) {
      throw new ForbiddenException('Authentication is disabled for this project');
    }

    // Find user
    const user = await this.prisma.tenantUser.findUnique({
      where: {
        projectId_email: {
          projectId,
          email: loginDto.email,
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    // Update last sign in
    await this.prisma.tenantUser.update({
      where: { id: user.id },
      data: { lastSignInAt: new Date() },
    });

    // Generate JWT token
    const jwtSecret = project.jwtSecret || process.env.JWT_SECRET;
    const access_token = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        projectId: project.id,
        type: 'tenant',
      },
      {
        secret: jwtSecret,
        expiresIn: project.jwtExpiresIn || '7d',
      },
    );

    return {
      access_token,
      user: this.sanitizeUser(user),
      projectId: project.id,
    };
  }

  /**
   * List all tenant users for a project (admin only)
   */
  async findAllForProject(organizationId: string, projectId: string) {
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

    const users = await this.prisma.tenantUser.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Get tenant user by ID
   */
  async findOne(organizationId: string, projectId: string, userId: string) {
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

    const user = await this.prisma.tenantUser.findFirst({
      where: {
        id: userId,
        projectId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Delete tenant user
   */
  async remove(organizationId: string, projectId: string, userId: string) {
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

    const user = await this.prisma.tenantUser.findFirst({
      where: {
        id: userId,
        projectId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.tenantUser.delete({
      where: { id: userId },
    });

    return this.sanitizeUser(user);
  }

  /**
   * Generate JWT secret for a project
   */
  async generateProjectJwtSecret(projectId: string): Promise<string> {
    const secret = crypto.randomBytes(32).toString('hex');
    
    await this.prisma.project.update({
      where: { id: projectId },
      data: { jwtSecret: secret },
    });

    return secret;
  }

  /**
   * Remove password hash from user object
   */
  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

