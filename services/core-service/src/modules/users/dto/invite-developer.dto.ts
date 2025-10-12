import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class InviteDeveloperDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}


