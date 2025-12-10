import { IsString, IsEmail, IsEnum, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { IntegrationType, AuthType, BancaStatus } from '../../domain/entities/banca.entity';

export class CreateBancaDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsNotEmpty()
  @IsEnum(IntegrationType)
  integrationType!: IntegrationType;

  @IsOptional()
  @IsEnum(AuthType)
  authType?: AuthType;

  @IsOptional()
  @IsString()
  rnc?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  endpoint?: string;
}

export class UpdateBancaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  rnc?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsEnum(IntegrationType)
  integrationType?: IntegrationType;

  @IsOptional()
  @IsEnum(AuthType)
  authType?: AuthType;
}

export class ApproveBancaDto {
  @IsNotEmpty()
  @IsString()
  bancaId!: string;

  @IsOptional()
  @IsString()
  endpoint?: string;
}

export class BancaResponseDto {
  id!: string;
  name!: string;
  integrationType!: string;
  authType!: string;
  endpoint?: string;
  rnc?: string;
  address?: string;
  phone?: string;
  email?: string;
  status!: string;
  isActive!: boolean;
  clientId?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class BancaCredentialsDto {
  clientId!: string;
  clientSecret!: string;
  hmacSecret!: string;
}

export class BancaListFilterDto {
  @IsOptional()
  @IsEnum(BancaStatus)
  status?: BancaStatus;

  @IsOptional()
  @IsEnum(IntegrationType)
  integrationType?: IntegrationType;
}
