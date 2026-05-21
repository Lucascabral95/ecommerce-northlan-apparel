import { beforeEach, describe, expect, it } from 'vitest';
import { InventoryService } from './inventory.service';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const VARIANT_ID = '22222222-2222-4222-8222-222222222222';

describe('InventoryService', () => {
  let prisma: FakeInventoryPrisma;
  let rabbitMqClient: FakeRabbitMqClient;
  let service: InventoryService;

  beforeEach(() => {
    prisma = new FakeInventoryPrisma();
    rabbitMqClient = new FakeRabbitMqClient();
    service = new InventoryService(
      { defaultReservationTtlSeconds: 900 } as never,
      prisma as never,
      rabbitMqClient as never,
    );
  });

  it('creates inventory through an admin stock adjustment and publishes an event', async () => {
    const item = await service.adjustStock(
      {
        mode: 'SET',
        productId: PRODUCT_ID,
        quantity: 5,
        reason: 'Initial stock load.',
        sku: 'NLA-TEE-BLK-M',
        variantId: VARIANT_ID,
      },
      testContext(),
    );

    expect(item.stockOnHand).toBe(5);
    expect(item.availableStock).toBe(5);
    expect(prisma.movements).toHaveLength(1);
    expect(rabbitMqClient.routingKeys).toContain('inventory.event.stock_adjusted');
  });

  it('reserves and releases stock without changing stock on hand', async () => {
    await seedInventory(service, 4);

    const reservation = await service.reserveStock(
      {
        idempotencyKey: 'idem-order-1',
        items: [{ quantity: 3, sku: 'NLA-TEE-BLK-M', variantId: VARIANT_ID }],
        orderId: 'order-1',
        userId: 'user-1',
      },
      testContext(),
    );

    expect(reservation.status).toBe('PENDING');
    expect(prisma.items[0]?.reservedStock).toBe(3);

    const released = await service.releaseStockReservation({ orderId: 'order-1' }, testContext());

    expect(released.status).toBe('RELEASED');
    expect(prisma.items[0]?.stockOnHand).toBe(4);
    expect(prisma.items[0]?.reservedStock).toBe(0);
    expect(rabbitMqClient.routingKeys).toContain('inventory.event.stock_reserved');
    expect(rabbitMqClient.routingKeys).toContain('inventory.event.stock_released');
  });

  it('does not oversell when available stock is already reserved', async () => {
    await seedInventory(service, 2);

    await service.reserveStock(
      {
        idempotencyKey: 'idem-order-1',
        items: [{ quantity: 2, sku: 'NLA-TEE-BLK-M', variantId: VARIANT_ID }],
        orderId: 'order-1',
        userId: 'user-1',
      },
      testContext(),
    );
    const failedReservation = await service.reserveStock(
      {
        idempotencyKey: 'idem-order-2',
        items: [{ quantity: 1, sku: 'NLA-TEE-BLK-M', variantId: VARIANT_ID }],
        orderId: 'order-2',
        userId: 'user-2',
      },
      testContext(),
    );

    expect(failedReservation.status).toBe('FAILED');
    expect(prisma.items[0]?.stockOnHand).toBe(2);
    expect(prisma.items[0]?.reservedStock).toBe(2);
    expect(rabbitMqClient.routingKeys).toContain('inventory.event.stock_reservation_failed');
  });
});

async function seedInventory(service: InventoryService, quantity: number): Promise<void> {
  await service.adjustStock(
    {
      mode: 'SET',
      productId: PRODUCT_ID,
      quantity,
      reason: 'Seed stock.',
      sku: 'NLA-TEE-BLK-M',
      variantId: VARIANT_ID,
    },
    testContext(),
  );
}

function testContext() {
  return {
    causationId: 'test-message',
    correlationId: 'test-correlation',
  };
}

type FakeInventoryItem = {
  createdAt: Date;
  id: string;
  isActive: boolean;
  lowStockThreshold: number;
  productId: string;
  reservedStock: number;
  sku: string;
  stockOnHand: number;
  updatedAt: Date;
  variantId: string;
};

type FakeReservation = {
  confirmedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  failureReason: string | null;
  id: string;
  idempotencyKey: string;
  items: unknown;
  itemsHash: string;
  orderId: string;
  releasedAt: Date | null;
  reservationId: string;
  status: 'CONFIRMED' | 'EXPIRED' | 'FAILED' | 'PENDING' | 'RELEASED';
  updatedAt: Date;
  userId: string;
};

class FakeRabbitMqClient {
  readonly routingKeys: string[] = [];

  async publish(input: { routingKey: string }): Promise<void> {
    this.routingKeys.push(input.routingKey);
  }
}

class FakeInventoryPrisma {
  readonly items: FakeInventoryItem[] = [];
  readonly movements: unknown[] = [];
  readonly reservations: FakeReservation[] = [];
  private sequence = 0;

  readonly inventoryItem = {
    create: async ({ data }: { data: Partial<FakeInventoryItem> }) => {
      const item: FakeInventoryItem = {
        createdAt: new Date(),
        id: this.nextId(),
        isActive: data.isActive ?? true,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        productId: required(data.productId),
        reservedStock: data.reservedStock ?? 0,
        sku: required(data.sku),
        stockOnHand: data.stockOnHand ?? 0,
        updatedAt: new Date(),
        variantId: required(data.variantId),
      };
      this.items.push(item);
      return item;
    },
    findUnique: async ({ where }: { where: { id: string } }) => this.items.find((item) => item.id === where.id) ?? null,
    update: async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => {
      const item = required(this.items.find((candidate) => candidate.id === where.id));
      if (typeof data.productId === 'string') {
        item.productId = data.productId;
      }
      item.stockOnHand = applyNumericMutation(item.stockOnHand, data.stockOnHand);
      item.reservedStock = applyNumericMutation(item.reservedStock, data.reservedStock);
      item.updatedAt = new Date();
      return { ...item };
    },
  };

  readonly stockMovement = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const movement = { ...data, createdAt: new Date(), id: this.nextId() };
      this.movements.push(movement);
      return movement;
    },
  };

  readonly stockReservation = {
    create: async ({ data }: { data: Partial<FakeReservation> }) => {
      const reservation: FakeReservation = {
        confirmedAt: null,
        createdAt: new Date(),
        expiresAt: required(data.expiresAt),
        failureReason: data.failureReason ?? null,
        id: this.nextId(),
        idempotencyKey: required(data.idempotencyKey),
        items: required(data.items),
        itemsHash: required(data.itemsHash),
        orderId: required(data.orderId),
        releasedAt: null,
        reservationId: required(data.reservationId),
        status: data.status ?? 'PENDING',
        updatedAt: new Date(),
        userId: required(data.userId),
      };
      this.reservations.push(reservation);
      return reservation;
    },
    findFirst: async ({ where }: { where: { OR: { [key: string]: string }[] } }) =>
      this.reservations.find((reservation) =>
        where.OR.some((filter) =>
          Object.entries(filter).some(([key, value]) => reservation[key as keyof FakeReservation] === value),
        ),
      ) ?? null,
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.reservations.find((reservation) => reservation.id === where.id) ?? null,
    update: async ({ data, where }: { data: Partial<FakeReservation>; where: { id: string } }) => {
      const reservation = required(this.reservations.find((candidate) => candidate.id === where.id));
      Object.assign(reservation, data, { updatedAt: new Date() });
      return { ...reservation };
    },
  };

  async $transaction<TValue>(callback: (tx: FakeInventoryPrisma) => Promise<TValue>): Promise<TValue> {
    return callback(this);
  }

  async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<readonly { id: string }[]> {
    const sql = strings.join('?');
    const value = String(values[0]);
    if (sql.includes('inventory_items')) {
      const item = this.items.find((candidate) => candidate.variantId === value);
      return item ? [{ id: item.id }] : [];
    }

    if (sql.includes('reservation_id')) {
      const reservation = this.reservations.find((candidate) => candidate.reservationId === value);
      return reservation ? [{ id: reservation.id }] : [];
    }

    const reservation = this.reservations.find((candidate) => candidate.orderId === value);
    return reservation ? [{ id: reservation.id }] : [];
  }

  private nextId(): string {
    this.sequence += 1;
    return `${this.sequence.toString().padStart(12, '0')}-0000-4000-8000-000000000000`;
  }
}

function applyNumericMutation(currentValue: number, mutation: unknown): number {
  if (typeof mutation === 'number') {
    return mutation;
  }

  if (!mutation || typeof mutation !== 'object') {
    return currentValue;
  }

  const operation = mutation as { decrement?: number; increment?: number };
  return currentValue + (operation.increment ?? 0) - (operation.decrement ?? 0);
}

function required<TValue>(value: TValue | null | undefined): TValue {
  if (value === undefined || value === null) {
    throw new Error('Expected value to be present.');
  }

  return value;
}
