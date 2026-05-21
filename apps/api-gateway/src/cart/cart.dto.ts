import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemRequestDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsUUID()
  variantId!: string;
}

export class UpdateCartItemRequestDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}
