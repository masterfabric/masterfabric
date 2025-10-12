import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Project {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  organizationId: string;

  @Field({ nullable: true })
  tenantDbUri?: string;

  @Field({ nullable: true })
  redisUri?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}


