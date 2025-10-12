import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { ApiKey } from './entities/api-key.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  @Mutation(() => Project)
  @UseGuards(GqlJwtAuthGuard)
  createProject(
    @Args('input') createProjectDto: CreateProjectDto,
    @Context() context: any,
  ) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.projectsService.create(organizationId, createProjectDto);
  }

  @Query(() => [Project], { name: 'projects' })
  @UseGuards(GqlJwtAuthGuard)
  findAll(@Context() context: any) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.projectsService.findAll(organizationId);
  }

  @Query(() => Project, { name: 'project' })
  @UseGuards(GqlJwtAuthGuard)
  findOne(@Args('id', { type: () => ID }) id: string, @Context() context: any) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.projectsService.findOne(id, organizationId);
  }

  @Mutation(() => Project)
  @UseGuards(GqlJwtAuthGuard)
  updateProject(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') updateProjectDto: UpdateProjectDto,
    @Context() context: any,
  ) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.projectsService.update(id, organizationId, updateProjectDto);
  }

  @Mutation(() => Project)
  @UseGuards(GqlJwtAuthGuard)
  deleteProject(@Args('id', { type: () => ID }) id: string, @Context() context: any) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.projectsService.remove(id, organizationId);
  }

  @Query(() => [ApiKey], { name: 'projectApiKeys' })
  @UseGuards(GqlJwtAuthGuard)
  getProjectApiKeys(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Context() context: any,
  ) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.projectsService.getApiKeys(projectId, organizationId);
  }

  @Mutation(() => ApiKey)
  @UseGuards(GqlJwtAuthGuard)
  createApiKey(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('name') name: string,
    @Context() context: any,
  ) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.projectsService.createApiKey(projectId, organizationId, name);
  }

  @Mutation(() => ApiKey)
  @UseGuards(GqlJwtAuthGuard)
  deleteApiKey(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any,
  ) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.projectsService.deleteApiKey(id, organizationId);
  }
}


