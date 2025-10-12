import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class UserResponse {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field()
  organizationId: string;
}

@ObjectType()
export class OrganizationResponse {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  status: string;
}

@ObjectType()
export class AuthResponse {
  @Field()
  token: string;

  @Field(() => UserResponse)
  user: UserResponse;

  @Field(() => OrganizationResponse, { nullable: true })
  organization?: OrganizationResponse;
}

