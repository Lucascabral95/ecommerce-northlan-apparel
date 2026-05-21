import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoryDto,
  CreateProductCommandPayload,
  GetProductCommandPayload,
  ListProductsCommandPayload,
  ProductDto,
  ProductListResponseDto,
  UpdateProductCommandPayload,
} from '@northlane/contracts';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { mapCategory, mapProduct, ProductWithRelations } from './catalog.mapper';
import { createSlug } from './slug';

const PRODUCT_INCLUDE = {
  images: true,
  variants: true,
} satisfies Prisma.ProductInclude;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: ListProductsCommandPayload): Promise<ProductListResponseDto> {
    const pagination = normalizePagination(query.page, query.pageSize);
    const where = this.buildProductWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        include: PRODUCT_INCLUDE,
        orderBy: this.resolveOrderBy(query.sortBy),
        skip: pagination.offset,
        take: pagination.limit,
        where,
      }),
      this.prisma.product.count({ where }),
    ]);
    const filters = await this.getFilters(query.includeInactive ?? false);

    return {
      filters,
      items: items.map((product) => mapProduct(product as ProductWithRelations)),
      total,
    };
  }

  async getProductBySlug(slug: string, includeInactive = false): Promise<ProductDto> {
    const product = await this.prisma.product.findFirst({
      include: PRODUCT_INCLUDE,
      where: {
        slug,
        ...(includeInactive ? {} : { isActive: true }),
      },
    });

    if (!product) {
      throw new NotFoundException('Product was not found.');
    }

    return mapProduct(product as ProductWithRelations);
  }

  async getProduct(input: GetProductCommandPayload, includeInactive = false): Promise<ProductDto> {
    if ('slug' in input && input.slug) {
      return this.getProductBySlug(input.slug, includeInactive);
    }

    const product = await this.prisma.product.findFirst({
      include: PRODUCT_INCLUDE,
      where: {
        id: input.productId,
        ...(includeInactive ? {} : { isActive: true }),
      },
    });

    if (!product) {
      throw new NotFoundException('Product was not found.');
    }

    return mapProduct(product as ProductWithRelations);
  }

  async listCategories(includeInactive = false): Promise<readonly CategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      where: includeInactive ? undefined : { isActive: true },
    });

    return categories.map(mapCategory);
  }

  async createProduct(input: CreateProductCommandPayload): Promise<ProductDto> {
    const slug = input.slug ? createSlug(input.slug) : createSlug(input.title);
    await this.ensureUniqueProduct(slug, input.skuBase);

    const category = await this.resolveCategory(input.categoryId, input.categoryName);
    const subcategory = input.subcategoryName
      ? await this.resolveCategory(input.subcategoryId, input.subcategoryName, category.id)
      : null;

    await this.ensureBrand(input.brand);
    await this.ensureCollection(input.collection);

    const product = await this.prisma.product.create({
      data: {
        brand: input.brand,
        canonicalUrl: input.canonicalUrl,
        careInstructions: input.careInstructions,
        categoryId: category.id,
        categoryName: category.name,
        collection: input.collection,
        compareAtPrice: input.compareAtPrice,
        composition: input.composition,
        costPrice: input.costPrice,
        currency: input.currency,
        description: input.description,
        discountPercentage: input.discountPercentage ?? 0,
        externalUrl: input.externalUrl,
        fit: input.fit,
        genderTarget: input.genderTarget,
        images: {
          create: (input.images ?? []).map((image) => ({
            altText: image.altText,
            isPrimary: image.isPrimary ?? false,
            position: image.position,
            url: image.url,
          })),
        },
        isActive: input.isActive ?? true,
        isBestSeller: input.isBestSeller ?? false,
        isFeatured: input.isFeatured ?? false,
        isNewArrival: input.isNewArrival ?? false,
        material: input.material,
        price: input.price,
        productType: input.productType,
        seoDescription: input.seoDescription,
        seoTitle: input.seoTitle,
        shortDescription: input.shortDescription,
        skuBase: input.skuBase,
        season: input.season,
        slug,
        subcategoryId: subcategory?.id,
        subcategoryName: subcategory?.name,
        tags: [...(input.tags ?? [])],
        taxRate: input.taxRate ?? 0.21,
        title: input.title,
        variants: {
          create: (input.variants ?? []).map((variant) => ({
            barcode: variant.barcode,
            colorHex: variant.colorHex,
            colorName: variant.colorName,
            isActive: variant.isActive ?? true,
            priceOverride: variant.priceOverride,
            reservedStock: variant.reservedStock ?? 0,
            size: variant.size,
            sku: variant.sku,
            stock: variant.stock,
            weightInGrams: variant.weightInGrams,
          })),
        },
      },
      include: PRODUCT_INCLUDE,
    });

    return mapProduct(product as ProductWithRelations);
  }

  async updateProduct(input: UpdateProductCommandPayload): Promise<ProductDto> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: input.id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product was not found.');
    }

    const slug = input.slug ? createSlug(input.slug) : undefined;
    if (slug && slug !== existingProduct.slug) {
      await this.ensureUniqueProduct(slug, undefined);
    }

    const category = input.categoryName || input.categoryId
      ? await this.resolveCategory(input.categoryId, input.categoryName ?? existingProduct.categoryName)
      : undefined;
    const subcategory = input.subcategoryName
      ? await this.resolveCategory(input.subcategoryId, input.subcategoryName, category?.id ?? existingProduct.categoryId)
      : undefined;

    if (input.brand) {
      await this.ensureBrand(input.brand);
    }

    if (input.collection !== undefined) {
      await this.ensureCollection(input.collection);
    }

    const product = await this.prisma.product.update({
      data: {
        brand: input.brand,
        canonicalUrl: input.canonicalUrl,
        careInstructions: input.careInstructions,
        categoryId: category?.id,
        categoryName: category?.name,
        collection: input.collection,
        compareAtPrice: input.compareAtPrice,
        composition: input.composition,
        costPrice: input.costPrice,
        currency: input.currency,
        description: input.description,
        discountPercentage: input.discountPercentage,
        externalUrl: input.externalUrl,
        fit: input.fit,
        genderTarget: input.genderTarget,
        images: input.images
          ? {
              create: input.images.map((image) => ({
                altText: image.altText,
                isPrimary: image.isPrimary ?? false,
                position: image.position,
                url: image.url,
              })),
              deleteMany: {},
            }
          : undefined,
        isActive: input.isActive,
        isBestSeller: input.isBestSeller,
        isFeatured: input.isFeatured,
        isNewArrival: input.isNewArrival,
        material: input.material,
        price: input.price,
        productType: input.productType,
        seoDescription: input.seoDescription,
        seoTitle: input.seoTitle,
        shortDescription: input.shortDescription,
        skuBase: input.skuBase,
        season: input.season,
        slug,
        subcategoryId: subcategory?.id,
        subcategoryName: subcategory?.name,
        tags: input.tags ? [...input.tags] : undefined,
        taxRate: input.taxRate,
        title: input.title,
        variants: input.variants
          ? {
              create: input.variants.map((variant) => ({
                barcode: variant.barcode,
                colorHex: variant.colorHex,
                colorName: variant.colorName,
                isActive: variant.isActive ?? true,
                priceOverride: variant.priceOverride,
                reservedStock: variant.reservedStock ?? 0,
                size: variant.size,
                sku: variant.sku,
                stock: variant.stock,
                weightInGrams: variant.weightInGrams,
              })),
              deleteMany: {},
            }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
      where: { id: input.id },
    });

    return mapProduct(product as ProductWithRelations);
  }

  private buildProductWhere(query: ListProductsCommandPayload): Prisma.ProductWhereInput {
    const filters: Prisma.ProductWhereInput[] = [];

    if (!query.includeInactive) {
      filters.push({ isActive: true });
    }

    if (query.brand) {
      filters.push({ brand: { equals: query.brand, mode: 'insensitive' } });
    }

    if (query.categorySlug) {
      filters.push({
        OR: [
          { category: { is: { slug: query.categorySlug } } },
          { subcategory: { is: { slug: query.categorySlug } } },
        ],
      });
    }

    if (query.color || query.size) {
      filters.push({
        variants: {
          some: {
            ...(query.color ? { colorName: { equals: query.color, mode: 'insensitive' } } : {}),
            ...(query.size ? { size: { equals: query.size, mode: 'insensitive' } } : {}),
          },
        },
      });
    }

    if (query.genderTarget) {
      filters.push({ genderTarget: query.genderTarget });
    }

    if (query.isFeatured !== undefined) {
      filters.push({ isFeatured: query.isFeatured });
    }

    if (query.maxPrice !== undefined || query.minPrice !== undefined) {
      filters.push({
        price: {
          ...(query.maxPrice === undefined ? {} : { lte: query.maxPrice }),
          ...(query.minPrice === undefined ? {} : { gte: query.minPrice }),
        },
      });
    }

    if (query.productType) {
      filters.push({ productType: query.productType });
    }

    if (query.search) {
      filters.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { shortDescription: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { brand: { contains: query.search, mode: 'insensitive' } },
          { skuBase: { contains: query.search, mode: 'insensitive' } },
          { tags: { has: query.search } },
        ],
      });
    }

    return filters.length > 0 ? { AND: filters } : {};
  }

  private resolveOrderBy(sortBy: ListProductsCommandPayload['sortBy']): Prisma.ProductOrderByWithRelationInput[] {
    if (sortBy === 'price_asc') {
      return [{ price: 'asc' }];
    }

    if (sortBy === 'price_desc') {
      return [{ price: 'desc' }];
    }

    if (sortBy === 'relevance') {
      return [{ isFeatured: 'desc' }, { isBestSeller: 'desc' }, { createdAt: 'desc' }];
    }

    return [{ createdAt: 'desc' }];
  }

  private async getFilters(includeInactive: boolean): Promise<ProductListResponseDto['filters']> {
    const [brands, categories, variants] = await Promise.all([
      this.prisma.brand.findMany({
        orderBy: { name: 'asc' },
        where: includeInactive ? undefined : { isActive: true },
      }),
      this.prisma.category.findMany({
        orderBy: { name: 'asc' },
        where: includeInactive ? undefined : { isActive: true },
      }),
      this.prisma.productVariant.findMany({
        select: { colorName: true, size: true },
        where: includeInactive ? undefined : { isActive: true, product: { is: { isActive: true } } },
      }),
    ]);

    return {
      brands: brands.map((brand) => brand.name),
      categories: categories.map(mapCategory),
      colors: uniqueSorted(variants.map((variant) => variant.colorName)),
      sizes: uniqueSorted(variants.map((variant) => variant.size)),
    };
  }

  private async ensureUniqueProduct(slug: string, skuBase: string | undefined): Promise<void> {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        OR: [
          { slug },
          ...(skuBase ? [{ skuBase }] : []),
        ],
      },
    });

    if (existingProduct) {
      throw new ConflictException('A product with the same slug or base SKU already exists.');
    }
  }

  private async resolveCategory(categoryId: string | undefined, categoryName: string, parentId?: string) {
    if (categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        throw new NotFoundException('Category was not found.');
      }

      return category;
    }

    return this.prisma.category.upsert({
      create: {
        name: categoryName,
        parentId,
        slug: createSlug(categoryName),
      },
      update: {
        name: categoryName,
      },
      where: {
        slug: createSlug(categoryName),
      },
    });
  }

  private async ensureBrand(name: string): Promise<void> {
    await this.prisma.brand.upsert({
      create: {
        name,
        slug: createSlug(name),
      },
      update: {
        name,
      },
      where: {
        slug: createSlug(name),
      },
    });
  }

  private async ensureCollection(name: string | undefined): Promise<void> {
    if (!name) {
      return;
    }

    await this.prisma.collection.upsert({
      create: {
        name,
        slug: createSlug(name),
      },
      update: {
        name,
      },
      where: {
        slug: createSlug(name),
      },
    });
  }
}

function normalizePagination(page = 1, pageSize = 24): { limit: number; offset: number } {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 24;

  return {
    limit: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
