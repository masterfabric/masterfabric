import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

@InputType()
export class UpdateOrganizationDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;
}


