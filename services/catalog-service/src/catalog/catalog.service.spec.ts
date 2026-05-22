import { describe, expect, it } from 'vitest';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  it('creates a product with resolved catalog ownership and sellable snapshots', async () => {
    const prisma = new FakeCatalogPrisma();
    const service = new CatalogService(prisma as never);

    const product = await service.createProduct({
      brand: 'Northlane',
      careInstructions: 'Wash cold and dry flat.',
      categoryName: 'Hoodies',
      composition: '80% cotton, 20% recycled polyester',
      currency: 'USD',
      description: 'Heavyweight hoodie built for cold routes and layered daily wear.',
      fit: 'OVERSIZED',
      genderTarget: 'UNISEX',
      images: [
        {
          altText: 'Black heavyweight hoodie',
          isPrimary: true,
          position: 0,
          url: 'https://cdn.northlane.test/hoodie-black.jpg',
        },
      ],
      material: 'Brushed fleece',
      price: 120,
      productType: 'HOODIE',
      shortDescription: 'Brushed heavyweight fleece hoodie.',
      skuBase: 'NLA-HOOD',
      season: 'WINTER',
      tags: ['hoodie', 'winter'],
      title: 'Hoodie Urban Heavyweight',
      variants: [
        {
          colorHex: '#111111',
          colorName: 'Black',
          size: 'L',
          sku: 'NLA-HOOD-BLK-L',
          stock: 8,
          weightInGrams: 860,
        },
      ],
    });

    expect(product).toMatchObject({
      brand: 'Northlane',
      categoryName: 'Hoodies',
      images: [{ isPrimary: true }],
      slug: 'hoodie-urban-heavyweight',
      tags: ['hoodie', 'winter'],
      variants: [{ availableStock: 8, sku: 'NLA-HOOD-BLK-L' }],
    });
    expect(prisma.brands).toEqual(['Northlane']);
  });
});

class FakeCatalogPrisma {
  readonly brands: string[] = [];
  private sequence = 0;
  private readonly categories = new Map<string, ReturnType<FakeCatalogPrisma['categoryRecord']>>();

  readonly brand = {
    upsert: async ({ create }: { create: { name: string } }) => {
      this.brands.push(create.name);
      return create;
    },
  };

  readonly collection = {
    upsert: async ({ create }: { create: { name: string } }) => create,
  };

  readonly category = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      [...this.categories.values()].find((category) => category.id === where.id) ?? null,
    upsert: async ({
      create,
      where,
    }: {
      create: { name: string; parentId?: string; slug: string };
      where: { slug: string };
    }) => {
      const existing = this.categories.get(where.slug);
      if (existing) {
        return existing;
      }

      const category = this.categoryRecord(create.name, create.slug, create.parentId);
      this.categories.set(where.slug, category);
      return category;
    },
  };

  readonly product = {
    create: async ({
      data,
    }: {
      data: Record<string, unknown> & {
        images: { create: Array<Record<string, unknown>> };
        variants: { create: Array<Record<string, unknown>> };
      };
    }) => ({
      ...data,
      averageRating: 0,
      categoryId: requiredString(data.categoryId),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      discountPercentage: data.discountPercentage ?? 0,
      id: this.nextId(),
      images: data.images.create.map((image) => ({
        ...image,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: this.nextId(),
        variantId: null,
      })),
      subcategoryId: data.subcategoryId ?? null,
      subcategoryName: data.subcategoryName ?? null,
      totalReviews: 0,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      variants: data.variants.create.map((variant) => ({
        ...variant,
        id: this.nextId(),
        priceOverride: null,
      })),
    }),
    findFirst: async () => null,
  };

  private categoryRecord(name: string, slug: string, parentId?: string) {
    return {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      description: null,
      id: this.nextId(),
      imageUrl: null,
      isActive: true,
      name,
      parentId: parentId ?? null,
      slug,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
  }

  private nextId() {
    this.sequence += 1;
    return `${this.sequence.toString().padStart(12, '0')}-0000-4000-8000-000000000000`;
  }
}

function requiredString(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Expected string.');
  }

  return value;
}
