import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { OrganizationStatus } from './entities/organization-status.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePostgresConnectionDto, UpdateRedisConnectionDto } from './dto/update-connection.dto';
import { ConnectionTestResult } from './dto/connection-test.dto';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';

@Resolver(() => Organization)
export class OrganizationsResolver {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Query(() => [Organization], { name: 'organizations' })
  @UseGuards(GqlJwtAuthGuard)
  findAll(@Context() context: any) {
    // Get organizationId from JWT token in context
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    // Return only user's organization
    return this.organizationsService.findByOrganizationId(organizationId);
  }

  @Query(() => Organization, { name: 'myOrganization' })
  @UseGuards(GqlJwtAuthGuard)
  async myOrganization(@Context() context: any): Promise<any> {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    const result = await this.organizationsService.findByOrganizationId(organizationId);
    // findByOrganizationId returns array, we need single object
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    return result;
  }

  @Query(() => OrganizationStatus, { name: 'organizationStatus' })
  @UseGuards(GqlJwtAuthGuard)
  async organizationStatus(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any,
  ): Promise<OrganizationStatus> {
    const organizationId = context.req?.user?.organizationId;
    // Verify user can only access their own organization
    if (id !== organizationId) {
      throw new Error('Unauthorized: Cannot access other organizations');
    }
    return this.organizationsService.getOrganizationStatus(id);
  }

  @Query(() => Organization, { name: 'organization' })
  @UseGuards(GqlJwtAuthGuard)
  findOne(@Args('id', { type: () => ID }) id: string, @Context() context: any) {
    const organizationId = context.req?.user?.organizationId;
    // Verify user can only access their own organization
    if (id !== organizationId) {
      throw new Error('Unauthorized: Cannot access other organizations');
    }
    return this.organizationsService.findOne(id);
  }

  @Mutation(() => Organization)
  @UseGuards(GqlJwtAuthGuard)
  updateOrganization(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') updateOrganizationDto: UpdateOrganizationDto,
    @Context() context: any,
  ) {
    const organizationId = context.req?.user?.organizationId;
    // Verify user can only update their own organization
    if (id !== organizationId) {
      throw new Error('Unauthorized: Cannot update other organizations');
    }
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Mutation(() => Organization)
  @UseGuards(GqlJwtAuthGuard)
  deleteOrganization(@Args('id', { type: () => ID }) id: string, @Context() context: any) {
    const organizationId = context.req?.user?.organizationId;
    // Verify user can only delete their own organization
    if (id !== organizationId) {
      throw new Error('Unauthorized: Cannot delete other organizations');
    }
    return this.organizationsService.remove(id);
  }

  // PostgreSQL Connection Management
  @Mutation(() => Organization)
  @UseGuards(GqlJwtAuthGuard)
  updatePostgresConnection(
    @Args('input') dto: UpdatePostgresConnectionDto,
    @Context() context: any,
  ) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.organizationsService.updatePostgresConnection(organizationId, dto);
  }

  @Query(() => ConnectionTestResult)
  @UseGuards(GqlJwtAuthGuard)
  testPostgresConnection(@Context() context: any) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.organizationsService.testPostgresConnection(organizationId);
  }

  // Redis Connection Management
  @Mutation(() => Organization)
  @UseGuards(GqlJwtAuthGuard)
  updateRedisConnection(
    @Args('input') dto: UpdateRedisConnectionDto,
    @Context() context: any,
  ) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.organizationsService.updateRedisConnection(organizationId, dto);
  }

  @Query(() => ConnectionTestResult)
  @UseGuards(GqlJwtAuthGuard)
  testRedisConnection(@Context() context: any) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.organizationsService.testRedisConnection(organizationId);
  }
}

