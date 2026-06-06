import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemRequestDto {
  @ApiProperty({ example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: '7d8e4611-9f01-41de-ff56-c5d6e7f8091a' })
  @IsUUID()
  variantId!: string;
}

export class UpdateCartItemRequestDto {
  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
