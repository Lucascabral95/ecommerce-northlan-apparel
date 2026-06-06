import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({ example: '1995-04-12' })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'DNI' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ example: 'Lucas' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'Gomez' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+5491123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: ['sweaters', 'camperas'], type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  preferredCategories?: string[];

  @ApiPropertyOptional({ example: ['M', 'L'], type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  preferredSizes?: string[];
}

export class CreateAddressRequestDto {
  @ApiProperty({ example: 'Casa' })
  @IsString()
  alias!: string;

  @ApiPropertyOptional({ example: '4B' })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({ example: 'Buenos Aires' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'Argentina' })
  @IsString()
  country!: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ example: '+5491123456789' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: 'C1001' })
  @IsString()
  postalCode!: string;

  @ApiProperty({ example: 'Buenos Aires' })
  @IsString()
  province!: string;

  @ApiProperty({ example: 'Lucas Gomez' })
  @IsString()
  recipientName!: string;

  @ApiPropertyOptional({ example: 'Timbre 4B' })
  @IsOptional()
  @IsString()
  references?: string;

  @ApiProperty({ example: 'Av. Corrientes' })
  @IsString()
  street!: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  streetNumber!: string;
}
