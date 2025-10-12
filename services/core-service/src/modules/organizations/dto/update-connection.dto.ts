import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class UpdatePostgresConnectionDto {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  postgresHost?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  postgresPort?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  postgresDb?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  postgresUser?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  postgresPassword?: string;
}

@InputType()
export class UpdateRedisConnectionDto {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  redisHost?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  redisPort?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  redisPassword?: string;
}

