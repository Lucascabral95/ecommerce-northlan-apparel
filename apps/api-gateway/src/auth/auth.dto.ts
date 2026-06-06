import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterRequestDto {
  @ApiProperty({ example: 'customer@northlane.test' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Lucas' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Gomez' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginRequestDto {
  @ApiProperty({ example: 'customer@northlane.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsString()
  password!: string;
}

export class RefreshRequestDto {
  @ApiProperty({ description: 'Refresh token returned by login/register.' })
  @IsString()
  refreshToken!: string;
}
