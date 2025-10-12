import { IsString, IsNumber, Min } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateProductDto {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsNumber()
  @Min(0)
  price: number;
}
