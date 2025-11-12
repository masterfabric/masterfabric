import { InputType, Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class QuerySchemaDataInput {
  @Field()
  tableName: string;

  @Field(() => GraphQLJSON, { nullable: true })
  where?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  orderBy?: any;

  @Field({ nullable: true })
  limit?: number;

  @Field({ nullable: true })
  offset?: number;
}

@InputType()
export class CreateSchemaDataInput {
  @Field()
  tableName: string;

  @Field(() => GraphQLJSON)
  data: any;
}

@InputType()
export class UpdateSchemaDataInput {
  @Field()
  tableName: string;

  @Field()
  id: string;

  @Field(() => GraphQLJSON)
  data: any;
}

@InputType()
export class DeleteSchemaDataInput {
  @Field()
  tableName: string;

  @Field()
  id: string;
}

