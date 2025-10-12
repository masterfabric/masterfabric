import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TenantUsersService } from './tenant-users.service';
import { TenantUser } from './entities/tenant-user.entity';
import { TenantAuthResponse } from './dto/tenant-auth-response.dto';
import { RegisterTenantUserInput } from './dto/register-tenant-user.dto';
import { LoginTenantUserInput } from './dto/login-tenant-user.dto';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => TenantUser)
export class TenantUsersResolver {
  constructor(private readonly tenantUsersService: TenantUsersService) {}

  /**
   * Public endpoint: Register a new tenant user
   * No authentication required (public API)
   */
  @Mutation(() => TenantAuthResponse)
  async registerTenantUser(
    @Args('projectId') projectId: string,
    @Args('input') registerDto: RegisterTenantUserInput,
  ) {
    return this.tenantUsersService.register(projectId, registerDto);
  }

  /**
   * Public endpoint: Login tenant user
   * No authentication required (public API)
   */
  @Mutation(() => TenantAuthResponse)
  async loginTenantUser(
    @Args('projectId') projectId: string,
    @Args('input') loginDto: LoginTenantUserInput,
  ) {
    return this.tenantUsersService.login(projectId, loginDto);
  }

  /**
   * Admin endpoint: List all tenant users in a project
   * Requires OWNER, CUSTOMER, or DEVELOPER role
   */
  @Query(() => [TenantUser])
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async tenantUsersForProject(
    @Args('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantUsersService.findAllForProject(user.organizationId, projectId);
  }

  /**
   * Admin endpoint: Get a specific tenant user
   * Requires OWNER, CUSTOMER, or DEVELOPER role
   */
  @Query(() => TenantUser)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async tenantUser(
    @Args('projectId') projectId: string,
    @Args('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantUsersService.findOne(user.organizationId, projectId, userId);
  }

  /**
   * Admin endpoint: Delete tenant user
   * Requires OWNER or CUSTOMER role
   */
  @Mutation(() => TenantUser)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER)
  async deleteTenantUser(
    @Args('projectId') projectId: string,
    @Args('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantUsersService.remove(user.organizationId, projectId, userId);
  }

  /**
   * Admin endpoint: Generate JWT secret for project
   * Requires OWNER role
   */
  @Mutation(() => String)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER)
  async generateProjectJwtSecret(
    @Args('projectId') projectId: string,
  ) {
    return this.tenantUsersService.generateProjectJwtSecret(projectId);
  }
}

