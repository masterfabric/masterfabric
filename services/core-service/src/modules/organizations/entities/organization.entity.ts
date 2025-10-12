import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class OrganizationCount {
  @Field(() => Int)
  users: number;

  @Field(() => Int)
  projects: number;
}

@ObjectType()
export class Organization {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  status: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => OrganizationCount)
  _count: OrganizationCount;
}


