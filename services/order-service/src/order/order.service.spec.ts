import { ConflictException } from '@nestjs/common';
import { CartDto, OrderStatus, ROUTING_KEYS } from '@northlane/contracts';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { OrderService } from './order.service';

const USER_ID = 'user-1';
const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const VARIANT_ID = '22222222-2222-4222-8222-222222222222';

describe('OrderService', () => {
  let cartClient: FakeCartClient;
  let prisma: FakeOrderPrisma;
  let rabbitMqClient: FakeRabbitMqClient;
  let service: OrderService;

  beforeEach(() => {
    cartClient = new FakeCartClient();
    prisma = new FakeOrderPrisma();
    rabbitMqClient = new FakeRabbitMqClient();
    service = new OrderService(
      cartClient as never,
      { paymentProvider: 'MOCK' } as never,
      prisma as never,
      rabbitMqClient as never,
    );
  });

  it('creates an order from the active cart and preserves item snapshots', async () => {
    const order = await service.createOrder(
      {
        idempotencyKey: 'checkout-1',
        shippingAddressSnapshot: { city: 'Buenos Aires', street: 'Suipacha' },
        userId: USER_ID,
      },
      testContext(),
    );

    expect(order.orderNumber).toMatch(/^NLA-\d{8}-[A-F0-9-]{8}$/);
    expect(order.status).toBe('PENDING');
    expect(order.subtotal).toBe(180);
    expect(order.grandTotal).toBe(180);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      productId: PRODUCT_ID,
      productImage: 'https://cdn.northlane.test/hoodie-black.jpg',
      productSlug: 'hoodie-urban-heavyweight',
      productTitle: 'Hoodie Urban Heavyweight',
      quantity: 2,
      selectedColor: 'Black',
      selectedSize: 'L',
      sku: 'NLA-HOOD-BLK-L',
      total: 180,
      unitPrice: 90,
      variantId: VARIANT_ID,
    });
    expect(order.statusHistory).toHaveLength(1);
    expect(order.statusHistory[0]?.status).toBe('PENDING');
    expect(rabbitMqClient.routingKeys).toEqual([
      'order.event.order_created',
      'inventory.command.reserve_stock',
    ]);
  });

  it('lists and reads the user order history', async () => {
    const createdOrder = await service.createOrder(
      {
        idempotencyKey: 'checkout-2',
        userId: USER_ID,
      },
      testContext(),
    );

    const orders = await service.listOrders({ userId: USER_ID });
    const orderDetail = await service.getOrder({ orderId: createdOrder.id, userId: USER_ID });

    expect(orders).toHaveLength(1);
    expect(orders[0]?.id).toBe(createdOrder.id);
    expect(orderDetail.items[0]?.sku).toBe('NLA-HOOD-BLK-L');
  });

  it('returns the original order when the same idempotency key and payload are repeated', async () => {
    const payload = {
      idempotencyKey: 'checkout-3',
      shippingAddressSnapshot: { city: 'Buenos Aires' },
      userId: USER_ID,
    };

    const firstOrder = await service.createOrder(payload, testContext());
    const secondOrder = await service.createOrder(payload, testContext());

    expect(secondOrder.id).toBe(firstOrder.id);
    expect(prisma.orders).toHaveLength(1);
    expect(rabbitMqClient.routingKeys).toHaveLength(2);
  });

  it('rejects reused idempotency keys with a different checkout payload', async () => {
    await service.createOrder(
      {
        idempotencyKey: 'checkout-4',
        shippingAddressSnapshot: { city: 'Buenos Aires' },
        userId: USER_ID,
      },
      testContext(),
    );

    await expect(
      service.createOrder(
        {
          idempotencyKey: 'checkout-4',
          shippingAddressSnapshot: { city: 'Cordoba' },
          userId: USER_ID,
        },
        testContext(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('moves a pending order to payment pending when stock is reserved', async () => {
    const createdOrder = await service.createOrder(
      {
        idempotencyKey: 'checkout-5',
        userId: USER_ID,
      },
      testContext(),
    );

    await service.handleStockReserved(
      {
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        items: [{ quantity: 2, sku: 'NLA-HOOD-BLK-L', variantId: VARIANT_ID }],
        orderId: createdOrder.id,
        reservationId: 'reservation-1',
        userId: USER_ID,
      },
      testContext(),
    );

    const orderDetail = await service.getOrder({ orderId: createdOrder.id, userId: USER_ID });

    expect(orderDetail.status).toBe('PAYMENT_PENDING');
    expect(orderDetail.statusHistory.map((history) => history.status)).toEqual([
      'PENDING',
      'STOCK_RESERVED',
      'PAYMENT_PENDING',
    ]);
    expect(rabbitMqClient.routingKeys).toContain('payment.command.request_payment');
  });

  it('creates a checkout session without publishing a duplicate stock reservation command', async () => {
    const session = await service.createCheckoutSession(
      {
        idempotencyKey: 'checkout-session-1',
        userId: USER_ID,
      },
      testContext(),
    );

    expect(session.status).toBe('MOCK_PROCESSED');
    expect(session.paymentProvider).toBe('MOCK');
    expect(session.order.status).toBe('PAYMENT_PENDING');
    expect(countRoutingKey(rabbitMqClient, ROUTING_KEYS.inventoryCommandReserveStock)).toBe(0);
    expect(countRequestedRoutingKey(rabbitMqClient, ROUTING_KEYS.inventoryCommandReserveStock)).toBe(1);
    expect(countRequestedRoutingKey(rabbitMqClient, ROUTING_KEYS.paymentCommandRequestPayment)).toBe(1);
  });

  it('cancels the checkout session and releases stock when payment session creation fails', async () => {
    rabbitMqClient.failPaymentRequestsWith = new Error('Mercado Pago preference creation failed.');

    await expect(
      service.createCheckoutSession(
        {
          idempotencyKey: 'checkout-session-failed',
          userId: USER_ID,
        },
        testContext(),
      ),
    ).rejects.toThrow('Mercado Pago preference creation failed.');

    const order = prisma.orders[0];
    expect(order?.status).toBe('CANCELLED');
    expect(countRoutingKey(rabbitMqClient, ROUTING_KEYS.inventoryCommandReleaseStock)).toBe(1);
    expect(countRoutingKey(rabbitMqClient, ROUTING_KEYS.orderEventOrderCancelled)).toBe(1);
  });

  it('keeps the order payment pending when a Mercado Pago preference is created', async () => {
    const createdOrder = await createPaymentPendingOrder(service);

    await service.handlePaymentPreferenceCreated(
      {
        checkoutUrl: 'https://mercadopago.test/checkout',
        idempotencyKey: `${createdOrder.id}:payment`,
        orderId: createdOrder.id,
        paymentId: 'payment-preference-1',
        provider: 'MERCADO_PAGO',
        providerPreferenceId: 'preference-1',
        userId: USER_ID,
      },
      testContext(),
    );

    const orderDetail = await service.getOrder({ orderId: createdOrder.id, userId: USER_ID });

    expect(orderDetail.status).toBe('PAYMENT_PENDING');
    expect(orderDetail.paymentId).toBe('payment-preference-1');
    expect(orderDetail.paymentStatus).toBe('PENDING');
    expect(countRoutingKey(rabbitMqClient, ROUTING_KEYS.inventoryCommandConfirmStock)).toBe(0);
    expect(countRoutingKey(rabbitMqClient, ROUTING_KEYS.cartCommandClearCart)).toBe(0);
  });

  it('confirms the order, confirms stock and clears the cart when payment succeeds', async () => {
    const createdOrder = await createPaymentPendingOrder(service);

    await service.handlePaymentSucceeded(
      {
        amount: 180,
        currency: 'USD',
        idempotencyKey: 'checkout-payment-success:payment',
        orderId: createdOrder.id,
        paymentId: 'payment-1',
        provider: 'MOCK',
        providerPaymentId: 'mock-payment-1',
        userId: USER_ID,
      },
      testContext(),
    );

    const orderDetail = await service.getOrder({ orderId: createdOrder.id, userId: USER_ID });

    expect(orderDetail.status).toBe('CONFIRMED');
    expect(orderDetail.paymentId).toBe('payment-1');
    expect(orderDetail.paymentStatus).toBe('APPROVED');
    expect(orderDetail.statusHistory.map((history) => history.status)).toEqual([
      'PENDING',
      'STOCK_RESERVED',
      'PAYMENT_PENDING',
      'PAID',
      'CONFIRMED',
    ]);
    expect(rabbitMqClient.routingKeys).toContain(ROUTING_KEYS.orderEventOrderConfirmed);
    expect(rabbitMqClient.routingKeys).toContain(ROUTING_KEYS.inventoryCommandConfirmStock);
    expect(rabbitMqClient.routingKeys).toContain(ROUTING_KEYS.cartCommandClearCart);
    expect(
      rabbitMqClient.published.find(
        (message) => message.routingKey === ROUTING_KEYS.cartCommandClearCart,
      )?.message.payload,
    ).toEqual({ userId: USER_ID });
  });

  it('does not re-run stock confirmation or cart clearing for duplicated payment success events', async () => {
    const createdOrder = await createPaymentPendingOrder(service);
    const paymentEvent = {
      amount: 180,
      currency: 'USD',
      idempotencyKey: 'checkout-payment-duplicate:payment',
      orderId: createdOrder.id,
      paymentId: 'payment-duplicate',
      provider: 'MOCK' as const,
      providerPaymentId: 'mock-payment-duplicate',
      userId: USER_ID,
    };

    await service.handlePaymentSucceeded(paymentEvent, testContext());
    await service.handlePaymentSucceeded(paymentEvent, testContext());

    expect(countRoutingKey(rabbitMqClient, ROUTING_KEYS.inventoryCommandConfirmStock)).toBe(1);
    expect(countRoutingKey(rabbitMqClient, ROUTING_KEYS.cartCommandClearCart)).toBe(1);
  });

  it('cancels the order and releases stock when payment fails', async () => {
    const createdOrder = await createPaymentPendingOrder(service);

    await service.handlePaymentFailed(
      {
        amount: 180,
        currency: 'USD',
        failureReason: 'Mock payment rejected by metadata outcome.',
        idempotencyKey: 'checkout-payment-failed:payment',
        orderId: createdOrder.id,
        paymentId: 'payment-failed',
        provider: 'MOCK',
        userId: USER_ID,
      },
      testContext(),
    );

    const orderDetail = await service.getOrder({ orderId: createdOrder.id, userId: USER_ID });

    expect(orderDetail.status).toBe('CANCELLED');
    expect(orderDetail.paymentStatus).toBe('REJECTED');
    expect(orderDetail.statusHistory.map((history) => history.status)).toEqual([
      'PENDING',
      'STOCK_RESERVED',
      'PAYMENT_PENDING',
      'FAILED',
      'CANCELLED',
    ]);
    expect(rabbitMqClient.routingKeys).toContain(ROUTING_KEYS.orderEventOrderCancelled);
    expect(rabbitMqClient.routingKeys).toContain(ROUTING_KEYS.inventoryCommandReleaseStock);
    expect(rabbitMqClient.routingKeys).not.toContain(ROUTING_KEYS.cartCommandClearCart);
  });

  it('preserves the provider cancellation status when payment is cancelled', async () => {
    const createdOrder = await createPaymentPendingOrder(service);

    await service.handlePaymentFailed(
      {
        amount: 180,
        currency: 'USD',
        failureReason: 'Payment was cancelled by the provider.',
        idempotencyKey: 'checkout-payment-cancelled:payment',
        orderId: createdOrder.id,
        paymentId: 'payment-cancelled',
        provider: 'MERCADO_PAGO',
        providerPaymentId: 'mp-payment-cancelled',
        userId: USER_ID,
      },
      testContext(),
      'CANCELLED',
    );

    const orderDetail = await service.getOrder({ orderId: createdOrder.id, userId: USER_ID });

    expect(orderDetail.status).toBe('CANCELLED');
    expect(orderDetail.paymentStatus).toBe('CANCELLED');
    expect(rabbitMqClient.routingKeys).toContain(ROUTING_KEYS.inventoryCommandReleaseStock);
    expect(rabbitMqClient.routingKeys).not.toContain(ROUTING_KEYS.cartCommandClearCart);
  });
});

function testContext() {
  return {
    causationId: 'test-message',
    correlationId: 'test-correlation',
  };
}

class FakeCartClient {
  async getActiveCart(): Promise<CartDto> {
    const now = new Date().toISOString();
    return {
      createdAt: now,
      currency: 'USD',
      id: 'cart-1',
      items: [
        {
          createdAt: now,
          id: 'cart-item-1',
          imageSnapshot: 'https://cdn.northlane.test/hoodie-black.jpg',
          productId: PRODUCT_ID,
          quantity: 2,
          selectedColor: 'Black',
          selectedSize: 'L',
          sku: 'NLA-HOOD-BLK-L',
          slugSnapshot: 'hoodie-urban-heavyweight',
          titleSnapshot: 'Hoodie Urban Heavyweight',
          total: 180,
          unitPriceSnapshot: 90,
          updatedAt: now,
          variantId: VARIANT_ID,
        },
      ],
      status: 'ACTIVE',
      subtotal: 180,
      updatedAt: now,
      userId: USER_ID,
    };
  }
}

class FakeRabbitMqClient {
  failPaymentRequestsWith?: Error;
  readonly published: Array<{ message: { payload?: unknown }; routingKey: string }> = [];
  readonly requested: Array<{ message: { payload?: unknown }; routingKey: string }> = [];
  readonly routingKeys: string[] = [];
  readonly requestedRoutingKeys: string[] = [];

  async publish(input: { message: { payload?: unknown }; routingKey: string }): Promise<void> {
    this.published.push(input);
    this.routingKeys.push(input.routingKey);
  }

  async request<TResponse>(input: {
    message: { payload?: unknown };
    routingKey: string;
  }): Promise<TResponse> {
    this.requested.push(input);
    this.requestedRoutingKeys.push(input.routingKey);

    if (input.routingKey === ROUTING_KEYS.inventoryCommandReserveStock) {
      const payload = input.message.payload as {
        items: Array<{ quantity: number; sku: string; variantId: string }>;
        orderId: string;
        userId: string;
      };

      return {
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        items: payload.items,
        orderId: payload.orderId,
        reservationId: `reservation-${payload.orderId}`,
        userId: payload.userId,
      } as TResponse;
    }

    if (input.routingKey === ROUTING_KEYS.paymentCommandRequestPayment) {
      if (this.failPaymentRequestsWith) {
        throw this.failPaymentRequestsWith;
      }

      const payload = input.message.payload as {
        amount: number;
        currency: string;
        idempotencyKey: string;
        orderId: string;
        provider: 'MOCK';
        userId: string;
      };

      return {
        amount: payload.amount,
        checkoutUrl: null,
        createdAt: new Date().toISOString(),
        currency: payload.currency,
        id: `payment-${payload.orderId}`,
        idempotencyKey: payload.idempotencyKey,
        orderId: payload.orderId,
        provider: payload.provider,
        providerPaymentId: `mock-${payload.orderId}`,
        status: 'APPROVED',
        updatedAt: new Date().toISOString(),
        userId: payload.userId,
      } as TResponse;
    }

    throw new Error(`Unexpected request routing key: ${input.routingKey}`);
  }
}

type FakeOrder = {
  billingAddressSnapshot: unknown | null;
  createdAt: Date;
  currency: string;
  discountTotal: number;
  grandTotal: number;
  id: string;
  idempotencyKey: string;
  orderNumber: string;
  paymentId: string | null;
  paymentStatus: string | null;
  shippingAddressSnapshot: unknown | null;
  shippingCost: number;
  status: OrderStatus;
  subtotal: number;
  taxTotal: number;
  updatedAt: Date;
  userId: string;
};

type FakeOrderItem = {
  brand: string | null;
  category: string | null;
  createdAt: Date;
  id: string;
  orderId: string;
  productId: string;
  productImage: string | null;
  productSlug: string;
  productTitle: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  sku: string;
  total: number;
  unitPrice: number;
  variantId: string;
};

type FakeOrderStatusHistory = {
  changedBy: string | null;
  createdAt: Date;
  id: string;
  orderId: string;
  reason: string | null;
  status: OrderStatus;
};

type FakeIdempotencyKey = {
  createdAt: Date;
  key: string;
  orderId: string;
  requestHash: string;
  updatedAt: Date;
  userId: string;
};

type FakeCreateOrderItemData = {
  productId?: unknown;
  productImage?: unknown;
  productSlug?: unknown;
  productTitle?: unknown;
  quantity?: unknown;
  selectedColor?: unknown;
  selectedSize?: unknown;
  sku?: unknown;
  total?: unknown;
  unitPrice?: unknown;
  variantId?: unknown;
};

type FakeCreateOrderData = {
  billingAddressSnapshot?: unknown;
  currency?: string;
  discountTotal?: number;
  grandTotal?: number;
  idempotencyKey?: string;
  items: {
    create: FakeCreateOrderItemData[];
  };
  orderNumber?: string;
  shippingAddressSnapshot?: unknown;
  shippingCost?: number;
  status?: OrderStatus;
  statusHistory: {
    create: {
      reason?: string;
      status: OrderStatus;
    };
  };
  subtotal?: number;
  taxTotal?: number;
  userId?: string;
};

class FakeOrderPrisma {
  readonly idempotencyKeys: FakeIdempotencyKey[] = [];
  readonly items: FakeOrderItem[] = [];
  readonly orders: FakeOrder[] = [];
  readonly statusHistory: FakeOrderStatusHistory[] = [];
  private sequence = 0;

  readonly idempotencyKey = {
    create: async ({ data }: { data: Omit<FakeIdempotencyKey, 'createdAt' | 'updatedAt'> }) => {
      const record: FakeIdempotencyKey = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.idempotencyKeys.push(record);
      return clone(record);
    },
    findUnique: async ({ where }: { where: { key: string } }) =>
      clone(this.idempotencyKeys.find((record) => record.key === where.key) ?? null),
  };

  readonly order = {
    create: async ({ data }: { data: FakeCreateOrderData }) => {
      const order: FakeOrder = {
        billingAddressSnapshot: data.billingAddressSnapshot ?? null,
        createdAt: new Date(),
        currency: required(data.currency),
        discountTotal: Number(data.discountTotal ?? 0),
        grandTotal: Number(data.grandTotal),
        id: this.nextId(),
        idempotencyKey: required(data.idempotencyKey),
        orderNumber: required(data.orderNumber),
        paymentId: null,
        paymentStatus: null,
        shippingAddressSnapshot: data.shippingAddressSnapshot ?? null,
        shippingCost: Number(data.shippingCost ?? 0),
        status: required(data.status),
        subtotal: Number(data.subtotal),
        taxTotal: Number(data.taxTotal ?? 0),
        updatedAt: new Date(),
        userId: required(data.userId),
      };
      this.orders.push(order);

      for (const itemData of data.items.create) {
        this.items.push({
          brand: null,
          category: null,
          createdAt: new Date(),
          id: this.nextId(),
          orderId: order.id,
          productId: requiredString(itemData.productId),
          productImage: typeof itemData.productImage === 'string' ? itemData.productImage : null,
          productSlug: requiredString(itemData.productSlug),
          productTitle: requiredString(itemData.productTitle),
          quantity: requiredNumber(itemData.quantity),
          selectedColor: requiredString(itemData.selectedColor),
          selectedSize: requiredString(itemData.selectedSize),
          sku: requiredString(itemData.sku),
          total: requiredNumber(itemData.total),
          unitPrice: requiredNumber(itemData.unitPrice),
          variantId: requiredString(itemData.variantId),
        });
      }

      this.statusHistory.push({
        changedBy: null,
        createdAt: new Date(),
        id: this.nextId(),
        orderId: order.id,
        reason: data.statusHistory.create.reason ?? null,
        status: data.statusHistory.create.status,
      });

      return clone(order);
    },
    findFirst: async ({ where }: { where: Partial<FakeOrder> }) =>
      clone(this.withRelations(this.orders.find((order) => matchesWhere(order, where)) ?? null)),
    findMany: async ({ where }: { where?: Partial<FakeOrder> }) =>
      clone(
        this.orders
          .filter((order) => !where || matchesWhere(order, where))
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .map((order) => this.withRelations(order)),
      ),
    findUnique: async ({ where }: { where: { id: string } }) =>
      clone(this.withRelations(this.orders.find((order) => order.id === where.id) ?? null)),
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      const order = this.orders.find((candidate) => candidate.id === where.id);
      return clone(required(order));
    },
    update: async ({ data, where }: { data: Partial<FakeOrder>; where: { id: string } }) => {
      const order = required(this.orders.find((candidate) => candidate.id === where.id));
      Object.assign(order, data, { updatedAt: new Date() });
      return clone(order);
    },
  };

  readonly orderStatusHistory = {
    create: async ({ data }: { data: Partial<FakeOrderStatusHistory> }) => {
      const history: FakeOrderStatusHistory = {
        changedBy: data.changedBy ?? null,
        createdAt: new Date(),
        id: this.nextId(),
        orderId: required(data.orderId),
        reason: data.reason ?? null,
        status: required(data.status),
      };
      this.statusHistory.push(history);
      return clone(history);
    },
  };

  async $transaction<TValue>(callback: (tx: FakeOrderPrisma) => Promise<TValue>): Promise<TValue> {
    return callback(this);
  }

  private nextId(): string {
    this.sequence += 1;
    return `${this.sequence.toString().padStart(12, '0')}-0000-4000-8000-000000000000`;
  }

  private withRelations(order: FakeOrder | null):
    | (FakeOrder & {
        items: FakeOrderItem[];
        statusHistory: FakeOrderStatusHistory[];
      })
    | null {
    if (!order) {
      return null;
    }

    return {
      ...order,
      items: this.items.filter((item) => item.orderId === order.id),
      statusHistory: this.statusHistory.filter((history) => history.orderId === order.id),
    };
  }
}

function matchesWhere<TValue extends Record<string, unknown>>(
  value: TValue | undefined,
  where: Partial<TValue>,
): boolean {
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

function requiredNumber(value: unknown): number {
  if (typeof value !== 'number') {
    throw new Error('Expected number value.');
  }

  return value;
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Expected string value.');
  }

  return value;
}

async function createPaymentPendingOrder(service: OrderService) {
  const createdOrder = await service.createOrder(
    {
      idempotencyKey: randomUUID(),
      userId: USER_ID,
    },
    testContext(),
  );

  await service.handleStockReserved(
    {
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      items: [{ quantity: 2, sku: 'NLA-HOOD-BLK-L', variantId: VARIANT_ID }],
      orderId: createdOrder.id,
      reservationId: `reservation-${createdOrder.id}`,
      userId: USER_ID,
    },
    testContext(),
  );

  return createdOrder;
}

function countRoutingKey(rabbitMqClient: FakeRabbitMqClient, routingKey: string): number {
  return rabbitMqClient.routingKeys.filter((candidate) => candidate === routingKey).length;
}

function countRequestedRoutingKey(rabbitMqClient: FakeRabbitMqClient, routingKey: string): number {
  return rabbitMqClient.requestedRoutingKeys.filter((candidate) => candidate === routingKey).length;
}
