import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProfileRequestDto {
  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  preferredCategories?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  preferredSizes?: string[];
}

export class CreateAddressRequestDto {
  @IsString()
  alias!: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsString()
  city!: string;

  @IsString()
  country!: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  phone!: string;

  @IsString()
  postalCode!: string;

  @IsString()
  province!: string;

  @IsString()
  recipientName!: string;

  @IsOptional()
  @IsString()
  references?: string;

  @IsString()
  street!: string;

  @IsString()
  streetNumber!: string;
}
