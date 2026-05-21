import { beforeEach, describe, expect, it } from 'vitest';
import { ProductDto } from '@northlane/contracts';
import { CartService } from './cart.service';

const USER_ID = 'user-1';
const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const VARIANT_ID = '22222222-2222-4222-8222-222222222222';

describe('CartService', () => {
  let catalogClient: FakeCatalogClient;
  let prisma: FakeCartPrisma;
  let service: CartService;

  beforeEach(() => {
    catalogClient = new FakeCatalogClient();
    prisma = new FakeCartPrisma();
    service = new CartService(catalogClient as never, prisma as never);
  });

  it('adds a product snapshot to the active cart', async () => {
    const cart = await service.addItem(
      {
        productId: PRODUCT_ID,
        quantity: 2,
        userId: USER_ID,
        variantId: VARIANT_ID,
      },
      testContext(),
    );

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      imageSnapshot: 'https://cdn.northlane.test/remera-black.jpg',
      productId: PRODUCT_ID,
      quantity: 2,
      selectedColor: 'Black',
      selectedSize: 'M',
      sku: 'NLA-TEE-BLK-M',
      slugSnapshot: 'remera-oversized-essential',
      titleSnapshot: 'Remera Oversized Essential',
      total: 90,
      unitPriceSnapshot: 45,
      variantId: VARIANT_ID,
    });
    expect(cart.subtotal).toBe(90);
  });

  it('increments quantity instead of duplicating the same variant', async () => {
    await service.addItem(
      {
        productId: PRODUCT_ID,
        quantity: 1,
        userId: USER_ID,
        variantId: VARIANT_ID,
      },
      testContext(),
    );

    const cart = await service.addItem(
      {
        productId: PRODUCT_ID,
        quantity: 3,
        userId: USER_ID,
        variantId: VARIANT_ID,
      },
      testContext(),
    );

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(4);
    expect(cart.items[0]?.total).toBe(180);
    expect(cart.subtotal).toBe(180);
  });

  it('updates, removes and clears cart items', async () => {
    const cartWithItem = await service.addItem(
      {
        productId: PRODUCT_ID,
        quantity: 2,
        userId: USER_ID,
        variantId: VARIANT_ID,
      },
      testContext(),
    );
    const itemId = required(cartWithItem.items[0]?.id);

    const updatedCart = await service.updateItem({
      itemId,
      quantity: 5,
      userId: USER_ID,
    });
    expect(updatedCart.items[0]?.quantity).toBe(5);
    expect(updatedCart.subtotal).toBe(225);

    const cartAfterDelete = await service.removeItem({
      itemId,
      userId: USER_ID,
    });
    expect(cartAfterDelete.items).toHaveLength(0);
    expect(cartAfterDelete.subtotal).toBe(0);

    await service.addItem(
      {
        productId: PRODUCT_ID,
        quantity: 1,
        userId: USER_ID,
        variantId: VARIANT_ID,
      },
      testContext(),
    );
    const clearedCart = await service.clearCart({ userId: USER_ID });
    expect(clearedCart.items).toHaveLength(0);
    expect(clearedCart.subtotal).toBe(0);
  });
});

function testContext() {
  return {
    causationId: 'test-message',
    correlationId: 'test-correlation',
  };
}

class FakeCatalogClient {
  async getProductById(): Promise<ProductDto> {
    return {
      averageRating: 4.8,
      brand: 'Northlane',
      careInstructions: 'Wash cold.',
      categoryId: '33333333-3333-4333-8333-333333333333',
      categoryName: 'Remeras',
      composition: '100% cotton',
      createdAt: new Date().toISOString(),
      currency: 'USD',
      description: 'Heavy cotton oversized tee.',
      discountPercentage: 0,
      fit: 'OVERSIZED',
      genderTarget: 'UNISEX',
      id: PRODUCT_ID,
      images: [
        {
          altText: 'Remera black',
          id: '44444444-4444-4444-8444-444444444444',
          isPrimary: true,
          position: 0,
          url: 'https://cdn.northlane.test/remera-black.jpg',
        },
      ],
      isActive: true,
      isBestSeller: true,
      isFeatured: true,
      isNewArrival: false,
      material: 'Cotton jersey',
      price: 45,
      productType: 'T_SHIRT',
      season: 'ALL_SEASON',
      shortDescription: 'Oversized tee.',
      skuBase: 'NLA-TEE',
      slug: 'remera-oversized-essential',
      tags: ['tee'],
      taxRate: 0.21,
      title: 'Remera Oversized Essential',
      totalReviews: 12,
      updatedAt: new Date().toISOString(),
      variants: [
        {
          availableStock: 10,
          colorHex: '#000000',
          colorName: 'Black',
          id: VARIANT_ID,
          isActive: true,
          reservedStock: 0,
          size: 'M',
          sku: 'NLA-TEE-BLK-M',
          stock: 10,
          weightInGrams: 260,
        },
      ],
    };
  }
}

type FakeCart = {
  createdAt: Date;
  currency: string;
  id: string;
  status: 'ABANDONED' | 'ACTIVE' | 'CHECKED_OUT';
  subtotal: number;
  updatedAt: Date;
  userId: string;
};

type FakeCartItem = {
  cartId: string;
  createdAt: Date;
  id: string;
  imageSnapshot: string | null;
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  sku: string;
  slugSnapshot: string;
  titleSnapshot: string;
  total: number;
  unitPriceSnapshot: number;
  updatedAt: Date;
  variantId: string;
};

class FakeCartPrisma {
  readonly carts: FakeCart[] = [];
  readonly items: FakeCartItem[] = [];
  private sequence = 0;

  readonly cart = {
    create: async ({ data }: { data: Partial<FakeCart> }) => {
      const cart: FakeCart = {
        createdAt: new Date(),
        currency: data.currency ?? 'USD',
        id: this.nextId(),
        status: data.status ?? 'ACTIVE',
        subtotal: 0,
        updatedAt: new Date(),
        userId: required(data.userId),
      };
      this.carts.push(cart);
      return { ...cart };
    },
    findFirst: async ({ where }: { where: Partial<FakeCart> }) =>
      clone(this.carts.find((cart) => matchesWhere(cart, where)) ?? null),
    findUnique: async ({ where }: { include?: unknown; where: { id: string } }) => {
      const cart = this.carts.find((candidate) => candidate.id === where.id);
      if (!cart) {
        return null;
      }

      return clone({
        ...cart,
        items: this.items.filter((item) => item.cartId === cart.id),
      });
    },
    update: async ({ data, where }: { data: Partial<FakeCart>; where: { id: string } }) => {
      const cart = required(this.carts.find((candidate) => candidate.id === where.id));
      Object.assign(cart, data, { updatedAt: new Date() });
      return { ...cart };
    },
  };

  readonly cartItem = {
    count: async ({ where }: { where: Partial<FakeCartItem> }) =>
      this.items.filter((item) => matchesWhere(item, where)).length,
    create: async ({ data }: { data: Partial<FakeCartItem> }) => {
      const item: FakeCartItem = {
        cartId: required(data.cartId),
        createdAt: new Date(),
        id: this.nextId(),
        imageSnapshot: data.imageSnapshot ?? null,
        productId: required(data.productId),
        quantity: required(data.quantity),
        selectedColor: required(data.selectedColor),
        selectedSize: required(data.selectedSize),
        sku: required(data.sku),
        slugSnapshot: required(data.slugSnapshot),
        titleSnapshot: required(data.titleSnapshot),
        total: required(data.total),
        unitPriceSnapshot: required(data.unitPriceSnapshot),
        updatedAt: new Date(),
        variantId: required(data.variantId),
      };
      this.items.push(item);
      return { ...item };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.items.findIndex((item) => item.id === where.id);
      const [item] = this.items.splice(index, 1);
      return required(item);
    },
    deleteMany: async ({ where }: { where: Partial<FakeCartItem> }) => {
      const beforeCount = this.items.length;
      for (let index = this.items.length - 1; index >= 0; index -= 1) {
        if (matchesWhere(this.items[index], where)) {
          this.items.splice(index, 1);
        }
      }
      return { count: beforeCount - this.items.length };
    },
    findFirst: async ({ where }: { where: Partial<FakeCartItem> }) =>
      clone(this.items.find((item) => matchesWhere(item, where)) ?? null),
    findMany: async ({ select, where }: { select?: { total?: boolean }; where: Partial<FakeCartItem> }) => {
      const items = this.items.filter((item) => matchesWhere(item, where));
      if (select?.total) {
        return items.map((item) => ({ total: item.total }));
      }

      return clone(items);
    },
    findUnique: async ({ where }: { where: { cartId_variantId: { cartId: string; variantId: string } } }) => {
      const item = this.items.find(
        (candidate) =>
          candidate.cartId === where.cartId_variantId.cartId &&
          candidate.variantId === where.cartId_variantId.variantId,
      );
      return clone(item ?? null);
    },
    update: async ({ data, where }: { data: Partial<FakeCartItem>; where: { id: string } }) => {
      const item = required(this.items.find((candidate) => candidate.id === where.id));
      Object.assign(item, data, { updatedAt: new Date() });
      return { ...item };
    },
  };

  async $transaction<TValue>(callback: (tx: FakeCartPrisma) => Promise<TValue>): Promise<TValue> {
    return callback(this);
  }

  private nextId(): string {
    this.sequence += 1;
    return `${this.sequence.toString().padStart(12, '0')}-0000-4000-8000-000000000000`;
  }
}

function matchesWhere<TValue extends Record<string, unknown>>(value: TValue | undefined, where: Partial<TValue>): boolean {
  if (!value) {
    return false;
  }

  return Object.entries(where).every(([key, expectedValue]) => value[key] === expectedValue);
}

function clone<TValue>(value: TValue): TValue {
  if (value === null) {
    return value;
  }

  return structuredClone(value);
}

function required<TValue>(value: TValue | null | undefined): TValue {
  if (value === undefined || value === null) {
    throw new Error('Expected value to be present.');
  }

  return value;
}
