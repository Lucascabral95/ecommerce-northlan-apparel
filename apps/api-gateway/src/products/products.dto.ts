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
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsIn(GENDER_TARGETS)
  genderTarget?: (typeof GENDER_TARGETS)[number];

  @IsOptional()
  @IsString()
  isFeatured?: string;

  @IsOptional()
  @IsString()
  maxPrice?: string;

  @IsOptional()
  @IsString()
  minPrice?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;

  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  productType?: (typeof PRODUCT_TYPES)[number];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sortBy?: (typeof SORT_OPTIONS)[number];
}

export class ProductVariantRequestDto {
  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  colorHex!: string;

  @IsString()
  colorName!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reservedStock?: number;

  @IsString()
  size!: string;

  @IsString()
  sku!: string;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsInt()
  @Min(1)
  weightInGrams!: number;
}

export class ProductImageRequestDto {
  @IsString()
  altText!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsInt()
  @Min(0)
  position!: number;

  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  variantSku?: string;
}

export class CreateProductRequestDto {
  @IsString()
  brand!: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @IsString()
  careInstructions!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  categoryName!: string;

  @IsOptional()
  @IsString()
  collection?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @IsString()
  composition!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsString()
  currency!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsIn(PRODUCT_FITS)
  fit!: (typeof PRODUCT_FITS)[number];

  @IsIn(GENDER_TARGETS)
  genderTarget!: (typeof GENDER_TARGETS)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => ProductImageRequestDto)
  images?: ProductImageRequestDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isBestSeller?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @IsString()
  material!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsIn(PRODUCT_TYPES)
  productType!: (typeof PRODUCT_TYPES)[number];

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsString()
  shortDescription!: string;

  @IsString()
  skuBase!: string;

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantRequestDto)
  variants?: ProductVariantRequestDto[];
}

export class UpdateProductRequestDto {
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @IsOptional()
  @IsString()
  careInstructions?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  collection?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @IsString()
  composition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsIn(PRODUCT_FITS)
  fit?: (typeof PRODUCT_FITS)[number];

  @IsOptional()
  @IsIn(GENDER_TARGETS)
  genderTarget?: (typeof GENDER_TARGETS)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => ProductImageRequestDto)
  images?: ProductImageRequestDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isBestSeller?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  productType?: (typeof PRODUCT_TYPES)[number];

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  skuBase?: string;

  @IsOptional()
  @IsIn(PRODUCT_SEASONS)
  season?: (typeof PRODUCT_SEASONS)[number];

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryName?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantRequestDto)
  variants?: ProductVariantRequestDto[];
}

export class AdjustProductStockRequestDto {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsIn(STOCK_ADJUST_MODES)
  mode?: (typeof STOCK_ADJUST_MODES)[number];

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  sku!: string;

  @IsUUID()
  variantId!: string;
}
