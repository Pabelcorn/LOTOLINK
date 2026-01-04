import { IsString, IsOptional, IsEmail, MinLength, IsDateString, IsISO8601 } from 'class-validator';

export class RegisterDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsISO8601()
  dateOfBirth!: string;
}

export class LoginDto {
  @IsString()
  phone!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  adminCode?: string;
}

export class OAuthLoginDto {
  @IsString()
  provider!: 'google' | 'apple' | 'facebook';

  @IsString()
  token!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;
}

export class AuthResponseDto {
  user!: {
    id: string;
    phone: string;
    email?: string;
    name?: string;
    role: string;
    isAdmin: boolean;
  };
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}
