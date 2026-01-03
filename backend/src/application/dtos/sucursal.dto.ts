import { IsString, IsOptional, IsNotEmpty, IsObject, MaxLength } from 'class-validator';

export class CreateSucursalDto {
  @IsNotEmpty()
  @IsString()
  bancaId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  operatorPrefix?: string;

  @IsOptional()
  @IsObject()
  ticketConfig?: {
    headerLogo?: string;
    footerText?: string;
    showBarcode?: boolean;
    showQR?: boolean;
    validityDays?: number;
  };
}

export class UpdateSucursalDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  operatorPrefix?: string;

  @IsOptional()
  @IsObject()
  ticketConfig?: object;
}

export class SucursalResponseDto {
  id!: string;
  bancaId!: string;
  name!: string;
  code!: string;
  address?: string;
  city?: string;
  phone?: string;
  operatorPrefix?: string;
  isActive!: boolean;
  ticketConfig!: object;
  createdAt!: Date;
  updatedAt!: Date;
}
