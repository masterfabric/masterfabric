import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class TenantUser {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  organizationId: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class TenantAuthResponse {
  @Field()
  token: string;

  @Field(() => TenantUser)
  user: TenantUser;
}
