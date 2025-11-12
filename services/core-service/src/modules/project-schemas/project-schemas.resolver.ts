import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProjectSchemasService } from './project-schemas.service';
import { ProjectSchema } from './entities/project-schema.entity';
import { CreateProjectSchemaInput } from './dto/create-project-schema.dto';
import { UpdateProjectSchemaInput } from './dto/update-project-schema.dto';
import { QuerySchemaDataInput, CreateSchemaDataInput, UpdateSchemaDataInput, DeleteSchemaDataInput } from './dto/query-schema-data.dto';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import GraphQLJSON from 'graphql-type-json';

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

  /**
   * Query data from a schema table
   * Requires OWNER, CUSTOMER, or DEVELOPER role
   */
  @Query(() => [GraphQLJSON], { name: 'querySchemaData' })
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async querySchemaData(
    @Args('projectId') projectId: string,
    @Args('input') input: QuerySchemaDataInput,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.queryData(
      user.organizationId,
      projectId,
      input.tableName,
      {
        where: input.where,
        orderBy: input.orderBy,
        limit: input.limit,
        offset: input.offset,
      }
    );
  }

  /**
   * Create data in a schema table
   * Requires OWNER, CUSTOMER, or DEVELOPER role
   */
  @Mutation(() => GraphQLJSON, { name: 'createSchemaData' })
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async createSchemaData(
    @Args('projectId') projectId: string,
    @Args('input') input: CreateSchemaDataInput,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.createData(
      user.organizationId,
      projectId,
      input.tableName,
      input.data
    );
  }

  /**
   * Update data in a schema table
   * Requires OWNER, CUSTOMER, or DEVELOPER role
   */
  @Mutation(() => GraphQLJSON, { name: 'updateSchemaData' })
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async updateSchemaData(
    @Args('projectId') projectId: string,
    @Args('input') input: UpdateSchemaDataInput,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.updateData(
      user.organizationId,
      projectId,
      input.tableName,
      input.id,
      input.data
    );
  }

  /**
   * Delete data from a schema table
   * Requires OWNER, CUSTOMER, or DEVELOPER role
   */
  @Mutation(() => GraphQLJSON, { name: 'deleteSchemaData' })
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async deleteSchemaData(
    @Args('projectId') projectId: string,
    @Args('input') input: DeleteSchemaDataInput,
    @CurrentUser() user: any,
  ) {
    return this.projectSchemasService.deleteData(
      user.organizationId,
      projectId,
      input.tableName,
      input.id
    );
  }
}

