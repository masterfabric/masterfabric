import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class FieldDefinition {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  type: string; // String, Int, Float, Boolean, DateTime
}

@InputType()
export class CreateSchemaDto {
  @Field()
  @IsString()
  tableName: string;

  @Field(() => [FieldDefinition])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinition)
  fields: FieldDefinition[];
}
