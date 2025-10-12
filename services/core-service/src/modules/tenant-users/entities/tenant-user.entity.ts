import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
@Directive('@key(fields: "id")')
export class TenantUser {
  @Field(() => ID)
  id: string;

  @Field()
  projectId: string;

  @Field()
  email: string;

  @Field()
  provider: string;

  @Field({ nullable: true })
  providerId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  emailConfirmed: boolean;

  @Field({ nullable: true })
  lastSignInAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

