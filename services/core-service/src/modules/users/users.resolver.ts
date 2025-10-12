import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, DeleteResult } from './entities/user.entity';
import { InviteDeveloperInput } from './dto/invite-developer.input';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwt-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User])
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER, UserRole.DEVELOPER)
  async organizationUsers(@Context() context: any): Promise<User[]> {
    const organizationId = context.req?.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found in token');
    }
    return this.usersService.getOrganizationUsers(organizationId);
  }

  @Mutation(() => User)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER)
  async inviteDeveloper(
    @Args('input') input: InviteDeveloperInput,
    @Context() context: any,
  ): Promise<User> {
    const userId = context.req?.user?.userId;
    const organizationId = context.req?.user?.organizationId;
    
    if (!userId || !organizationId) {
      throw new Error('User information not found in token');
    }
    
    return this.usersService.inviteDeveloper(userId, organizationId, input);
  }

  @Mutation(() => DeleteResult)
  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(UserRole.OWNER, UserRole.CUSTOMER)
  async deleteUser(
    @Args('id') userId: string,
    @Context() context: any,
  ): Promise<DeleteResult> {
    const requestUserId = context.req?.user?.userId;
    const organizationId = context.req?.user?.organizationId;
    
    if (!requestUserId || !organizationId) {
      throw new Error('User information not found in token');
    }
    
    await this.usersService.deleteUser(userId, requestUserId, organizationId);
    
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}

