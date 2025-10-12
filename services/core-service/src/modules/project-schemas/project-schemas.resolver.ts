import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProjectSchemasService } from './project-schemas.service';
import { ProjectSchema } from './entities/project-schema.entity';
import { CreateProjectSchemaInput } from './dto/create-project-schema.dto';
import { UpdateProjectSchemaInput } from './dto/update-project-schema.dto';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => ProjectSchema)
export class ProjectSchemasResolver {
  constructor(private readonly projectSchemasService: ProjectSchemasService) {}

  /**
   * Create a new schema for a project
   * Requires OWNER or CUSTOMER role
   */
  @Mutation(() => ProjectSchema)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER)
  async createProjectSchema(
    @Args('projectId') projectId: string,
    @Args('input') createDto: CreateProjectSchemaInput,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.create(user.organizationId, projectId, createDto);
  }

  /**
   * List all schemas for a project
   * Requires OWNER, CUSTOMER, or DEVELOPER role
   */
  @Query(() => [ProjectSchema])
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async projectSchemas(
    @Args('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.findAll(user.organizationId, projectId);
  }

  /**
   * Get a specific schema
   * Requires OWNER, CUSTOMER, or DEVELOPER role
   */
  @Query(() => ProjectSchema)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async projectSchema(
    @Args('projectId') projectId: string,
    @Args('schemaId') schemaId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.findOne(user.organizationId, projectId, schemaId);
  }

  /**
   * Update schema metadata
   * Requires OWNER or CUSTOMER role
   */
  @Mutation(() => ProjectSchema)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER)
  async updateProjectSchema(
    @Args('projectId') projectId: string,
    @Args('schemaId') schemaId: string,
    @Args('input') updateDto: UpdateProjectSchemaInput,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.update(user.organizationId, projectId, schemaId, updateDto);
  }

  /**
   * Delete schema and its table
   * Requires OWNER or CUSTOMER role
   */
  @Mutation(() => ProjectSchema)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER)
  async deleteProjectSchema(
    @Args('projectId') projectId: string,
    @Args('schemaId') schemaId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.remove(user.organizationId, projectId, schemaId);
  }
}

