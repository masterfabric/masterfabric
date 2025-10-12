import { IsEmail, IsString } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class TenantLoginDto {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  password: string;
}
