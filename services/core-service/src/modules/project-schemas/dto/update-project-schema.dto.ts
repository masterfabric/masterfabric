import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpdateProjectSchemaInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsArray()
  fields?: Array<{
    name: string;
    type: string;
    required?: boolean;
    unique?: boolean;
    default?: any;
  }>;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enableRLS?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsArray()
  policies?: Array<{
    name: string;
    operation: string;
    expression: string;
  }>;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enableRealtime?: boolean;
}

