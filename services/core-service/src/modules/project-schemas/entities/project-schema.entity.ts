import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
@Directive('@key(fields: "id")')
export class ProjectSchema {
  @Field(() => ID)
  id: string;

  @Field()
  projectId: string;

  @Field()
  tableName: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field(() => GraphQLJSON)
  fields: any;

  @Field()
  enableRLS: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  policies?: any;

  @Field()
  enableRealtime: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

