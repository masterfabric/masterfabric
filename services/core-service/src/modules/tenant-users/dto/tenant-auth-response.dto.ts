import { ObjectType, Field } from '@nestjs/graphql';
import { TenantUser } from '../entities/tenant-user.entity';

@ObjectType()
export class TenantAuthResponse {
  @Field()
  access_token: string;

  @Field(() => TenantUser)
  user: TenantUser;

  @Field()
  projectId: string;
}

