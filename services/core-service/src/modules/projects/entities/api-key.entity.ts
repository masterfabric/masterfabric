import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ApiKey {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  key: string;

  @Field()
  createdAt: string;

  @Field({ nullable: true })
  lastUsedAt?: string;
}
