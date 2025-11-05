import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './entities/auth-response.entity';
import { Project } from '../projects/entities/project.entity';
import { GqlJwtAuthGuard } from './guards/gql-jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public() // Allow public registration without API key
  @Mutation(() => AuthResponse)
  async register(@Args('input') input: RegisterInput): Promise<AuthResponse> {
    const result: any = await this.authService.register({
      email: input.email,
      password: input.password,
      organizationName: input.organizationName,
      organizationSlug: input.organizationSlug,
    });
    
    return {
      token: result.access_token || result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
      },
      organization: result.organization ? {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        status: result.organization.status,
      } : undefined,
    };
  }

  @Public() // Allow public login without API key
  @Mutation(() => AuthResponse)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<AuthResponse> {
    const result: any = await this.authService.login({ email, password });
    
    return {
      token: result.access_token || result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
      },
    };
  }

  @Query(() => [Project], { name: 'developerProjects' })
  @UseGuards(GqlJwtAuthGuard)
  async getDeveloperProjects(@Context() context: any) {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.authService.getDeveloperAccessibleProjects(organizationId);
  }
}

