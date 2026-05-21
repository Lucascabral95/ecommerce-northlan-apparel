import { CategoryDto, ProductDto, ProductImageDto, ProductVariantDto } from '@northlane/contracts';
import { Category, Prisma } from '../generated/prisma';

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    images: true;
    variants: true;
  };
}>;

export function mapProduct(product: ProductWithRelations): ProductDto {
  return {
    averageRating: toNumber(product.averageRating),
    brand: product.brand,
    canonicalUrl: product.canonicalUrl ?? undefined,
    careInstructions: product.careInstructions,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    collection: product.collection ?? undefined,
    compareAtPrice: product.compareAtPrice ? toNumber(product.compareAtPrice) : undefined,
    composition: product.composition,
    costPrice: product.costPrice ? toNumber(product.costPrice) : undefined,
    createdAt: product.createdAt.toISOString(),
    currency: product.currency,
    description: product.description,
    discountPercentage: toNumber(product.discountPercentage),
    externalUrl: product.externalUrl ?? undefined,
    fit: product.fit,
    genderTarget: product.genderTarget,
    id: product.id,
    images: product.images.sort((left, right) => left.position - right.position).map(mapImage),
    isActive: product.isActive,
    isBestSeller: product.isBestSeller,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    material: product.material,
    price: toNumber(product.price),
    productType: product.productType,
    seoDescription: product.seoDescription ?? undefined,
    seoTitle: product.seoTitle ?? undefined,
    shortDescription: product.shortDescription,
    skuBase: product.skuBase,
    season: product.season,
    slug: product.slug,
    subcategoryId: product.subcategoryId ?? undefined,
    subcategoryName: product.subcategoryName ?? undefined,
    tags: product.tags,
    taxRate: toNumber(product.taxRate),
    title: product.title,
    totalReviews: product.totalReviews,
    updatedAt: product.updatedAt.toISOString(),
    variants: product.variants.map(mapVariant),
  };
}

export function mapCategory(category: Category): CategoryDto {
  return {
    createdAt: category.createdAt.toISOString(),
    description: category.description ?? undefined,
    id: category.id,
    imageUrl: category.imageUrl ?? undefined,
    isActive: category.isActive,
    name: category.name,
    parentId: category.parentId ?? undefined,
    slug: category.slug,
    updatedAt: category.updatedAt.toISOString(),
  };
}

function mapVariant(variant: ProductWithRelations['variants'][number]): ProductVariantDto {
  return {
    availableStock: Math.max(variant.stock - variant.reservedStock, 0),
    barcode: variant.barcode ?? undefined,
    colorHex: variant.colorHex,
    colorName: variant.colorName,
    id: variant.id,
    isActive: variant.isActive,
    priceOverride: variant.priceOverride ? toNumber(variant.priceOverride) : undefined,
    reservedStock: variant.reservedStock,
    size: variant.size,
    sku: variant.sku,
    stock: variant.stock,
    weightInGrams: variant.weightInGrams,
  };
}

function mapImage(image: ProductWithRelations['images'][number]): ProductImageDto {
  return {
    altText: image.altText,
    id: image.id,
    isPrimary: image.isPrimary,
    position: image.position,
    url: image.url,
    variantId: image.variantId ?? undefined,
  };
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}
