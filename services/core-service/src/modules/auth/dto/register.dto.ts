import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  organizationName: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Organization slug must contain only lowercase letters, numbers, and hyphens',
  })
  organizationSlug: string;
}
