import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

const GENDER_TARGETS = ['KIDS', 'MEN', 'UNISEX', 'WOMEN'] as const;
const PRODUCT_TYPES = [
  'ACCESSORY',
  'DRESS',
  'HOODIE',
  'JACKET',
  'JEANS',
  'OTHER',
  'PANTS',
  'SHIRT',
  'SHOES',
  'SWEATER',
  'T_SHIRT',
] as const;
const PRODUCT_FITS = ['OVERSIZED', 'REGULAR', 'RELAXED', 'SLIM'] as const;
const PRODUCT_SEASONS = ['ALL_SEASON', 'MID_SEASON', 'SUMMER', 'WINTER'] as const;
const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'relevance'] as const;
const STOCK_ADJUST_MODES = ['DECREMENT', 'INCREMENT', 'SET'] as const;

export class ListProductsQueryDto {
  @ApiPropertyOptional({ example: 'Devré' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'remeras' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ example: 'negro' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: GENDER_TARGETS, example: 'MEN' })
  @IsOptional()
  @IsIn(GENDER_TARGETS)
  genderTarget?: (typeof GENDER_TARGETS)[number];

  @ApiPropertyOptional({ description: 'Boolean-like string.', example: 'true' })
  @IsOptional()
  @IsString()
  isFeatured?: string;

  @ApiPropertyOptional({ example: '200000' })
  @IsOptional()
  @IsString()
  maxPrice?: string;

  @ApiPropertyOptional({ example: '10000' })
  @IsOptional()
  @IsString()
  minPrice?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '24' })
  @IsOptional()
  @IsString()
  pageSize?: string;

  @ApiPropertyOptional({ enum: PRODUCT_TYPES, example: 'JACKET' })
  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  productType?: (typeof PRODUCT_TYPES)[number];

  @ApiPropertyOptional({ example: 'sobretodo' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'M' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ enum: SORT_OPTIONS, example: 'newest' })
  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sortBy?: (typeof SORT_OPTIONS)[number];
}

export class ProductVariantRequestDto {
  @ApiPropertyOptional({ example: '7791234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: '#111827' })
  @IsString()
  colorHex!: string;

  @ApiProperty({ example: 'Negro' })
  @IsString()
  colorName!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 69990, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reservedStock?: number;

  @ApiProperty({ example: 'M' })
  @IsString()
  size!: string;

  @ApiProperty({ example: 'DEV-JACKET-BLK-M' })
  @IsString()
  sku!: string;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({ example: 700, minimum: 1 })
  @IsInt()
  @Min(1)
  weightInGrams!: number;
}

export class ProductImageRequestDto {
  @ApiProperty({ example: 'Campera inflada negra frente' })
  @IsString()
  altText!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/product.webp' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ example: 'DEV-JACKET-BLK-M' })
  @IsOptional()
  @IsString()
  variantSku?: string;
}

export class CreateProductRequestDto {
  @ApiProperty({ example: 'Devré' })
  @IsString()
  brand!: string;

  @ApiPropertyOptional({ example: 'https://northlane.test/products/campera_inflada_negra' })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiProperty({ example: 'Lavar con agua fría. No usar secadora.' })
  @IsString()
  careInstructions!: string;

  @ApiPropertyOptional({ example: '2b3c4d5e-6f7a-4890-b123-23456789abcd' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 'Camperas' })
  @IsString()
  categoryName!: string;

  @ApiPropertyOptional({ example: 'Invierno 2026' })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({ example: 89990, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiProperty({ example: '100% Poliamida' })
  @IsString()
  composition!: string;

  @ApiPropertyOptional({ example: 45000, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiProperty({ example: 'ARS' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: 'Campera inflada negra de corte corto y cuello alto.' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @ApiPropertyOptional({ example: 'https://brand.example/product' })
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiProperty({ enum: PRODUCT_FITS, example: 'REGULAR' })
  @IsIn(PRODUCT_FITS)
  fit!: (typeof PRODUCT_FITS)[number];

  @ApiProperty({ enum: GENDER_TARGETS, example: 'MEN' })
  @IsIn(GENDER_TARGETS)
  genderTarget!: (typeof GENDER_TARGETS)[number];

  @ApiPropertyOptional({ type: [ProductImageRequestDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => ProductImageRequestDto)
  images?: ProductImageRequestDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isBestSeller?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiProperty({ example: 'Poliamida' })
  @IsString()
  material!: string;

  @ApiProperty({ example: 59990, minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ enum: PRODUCT_TYPES, example: 'JACKET' })
  @IsIn(PRODUCT_TYPES)
  productType!: (typeof PRODUCT_TYPES)[number];

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ example: 'Campera inflada negra con cuello alto.' })
  @IsString()
  shortDescription!: string;

  @ApiProperty({ example: 'DEV-JACKET-BLK' })
  @IsString()
  skuBase!: string;

  @ApiProperty({ enum: PRODUCT_SEASONS, example: 'WINTER' })
  @IsIn(PRODUCT_SEASONS)
  season!: (typeof PRODUCT_SEASONS)[number];

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryName?: string;

  @ApiPropertyOptional({ example: ['camperas', 'invierno'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiProperty({ example: 'Campera Inflada Negra' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ type: [ProductVariantRequestDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantRequestDto)
  variants?: ProductVariantRequestDto[];
}

export class UpdateProductRequestDto extends PartialType(CreateProductRequestDto) {}

export class AdjustProductStockRequestDto {
  @ApiPropertyOptional({ example: 'stock-adjust-20260605-001' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ enum: STOCK_ADJUST_MODES, example: 'SET' })
  @IsOptional()
  @IsIn(STOCK_ADJUST_MODES)
  mode?: (typeof STOCK_ADJUST_MODES)[number];

  @ApiProperty({ example: 20, minimum: 0 })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ example: 'Initial stock load.' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ example: 'DEV-JACKET-BLK-M' })
  @IsString()
  sku!: string;

  @ApiProperty({ example: '7d8e4611-9f01-41de-ff56-c5d6e7f8091a' })
  @IsUUID()
  variantId!: string;
}
