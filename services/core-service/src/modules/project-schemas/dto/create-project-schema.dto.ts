import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsBoolean, IsOptional, IsObject, IsArray, MinLength, MaxLength, Matches } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateProjectSchemaInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Table name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores',
  })
  tableName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field(() => GraphQLJSON)
  @IsArray()
  fields: Array<{
    name: string;
    type: string; // 'string', 'number', 'boolean', 'date', 'json'
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
    operation: string; // 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    expression: string; // SQL-like expression
  }>;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enableRealtime?: boolean;

  // Authentication & Rate Limiting
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  requireAuth?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  rateLimit?: number; // Max queries per minute

  // Metadata
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata?: {
    description?: string;
    tags?: string[];
    version?: string;
    [key: string]: any;
  };
}

