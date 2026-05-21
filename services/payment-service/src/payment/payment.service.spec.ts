import { BadRequestException, ConflictException } from '@nestjs/common';
import { RequestPaymentCommandPayload } from '@northlane/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { PaymentService } from './payment.service';

const BASE_PAYMENT: RequestPaymentCommandPayload = {
  amount: 180,
  currency: 'USD',
  idempotencyKey: 'order-1:payment',
  orderId: 'order-1',
  provider: 'MOCK',
  userId: 'user-1',
};

describe('PaymentService', () => {
  let config: FakePaymentConfig;
  let prisma: FakePaymentPrisma;
  let rabbitMqClient: FakeRabbitMqClient;
  let service: PaymentService;

  beforeEach(() => {
    config = new FakePaymentConfig();
    prisma = new FakePaymentPrisma();
    rabbitMqClient = new FakeRabbitMqClient();
    service = new PaymentService(config as never, prisma as never, rabbitMqClient as never);
  });

  it('approves a MOCK payment, stores events and publishes success', async () => {
    const payment = await service.processPayment(BASE_PAYMENT, testContext());

    expect(payment).toMatchObject({
      amount: 180,
      currency: 'USD',
      idempotencyKey: 'order-1:payment',
      orderId: 'order-1',
      provider: 'MOCK',
      status: 'APPROVED',
      userId: 'user-1',
    });
    expect(payment.providerPaymentId).toMatch(/^mock_/);
    expect(prisma.payments).toHaveLength(1);
    expect(prisma.events.map((event) => event.type)).toEqual([
      'payment.internal.requested',
      'payment.event.payment_succeeded',
    ]);
    expect(rabbitMqClient.routingKeys).toEqual(['payment.event.payment_succeeded']);
  });

  it('rejects a MOCK payment when metadata asks for failure', async () => {
    const payment = await service.processPayment(
      {
        ...BASE_PAYMENT,
        idempotencyKey: 'order-2:payment',
        metadata: { simulateFailure: true },
        orderId: 'order-2',
      },
      testContext(),
    );

    expect(payment.status).toBe('REJECTED');
    expect(payment.failureReason).toBe('Mock payment failure requested by metadata.');
    expect(rabbitMqClient.routingKeys).toEqual(['payment.event.payment_failed']);
  });

  it('rejects a MOCK payment for the configured failure amount', async () => {
    const payment = await service.processPayment(
      {
        ...BASE_PAYMENT,
        amount: 13.37,
        idempotencyKey: 'order-3:payment',
        orderId: 'order-3',
      },
      testContext(),
    );

    expect(payment.status).toBe('REJECTED');
    expect(payment.failureReason).toContain('configured failure amount');
    expect(rabbitMqClient.routingKeys).toEqual(['payment.event.payment_failed']);
  });

  it('returns the original payment for repeated idempotent requests', async () => {
    const firstPayment = await service.processPayment(BASE_PAYMENT, testContext());
    const secondPayment = await service.processPayment(BASE_PAYMENT, testContext());

    expect(secondPayment.id).toBe(firstPayment.id);
    expect(prisma.payments).toHaveLength(1);
    expect(prisma.events).toHaveLength(2);
    expect(rabbitMqClient.routingKeys).toHaveLength(1);
  });

  it('rejects reused idempotency keys with a different payload', async () => {
    await service.processPayment(BASE_PAYMENT, testContext());

    await expect(
      service.processPayment(
        {
          ...BASE_PAYMENT,
          amount: 200,
        },
        testContext(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects non-MOCK providers in the MVP phase', async () => {
    await expect(
      service.processPayment(
        {
          ...BASE_PAYMENT,
          provider: 'STRIPE',
        },
        testContext(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function testContext() {
  return {
    causationId: 'test-message',
    correlationId: 'test-correlation',
  };
}

class FakePaymentConfig {
  readonly mockFailureAmount = 13.37;
  readonly mockForceFailure = false;
  readonly providerMode = 'MOCK';
}

class FakeRabbitMqClient {
  readonly routingKeys: string[] = [];

  async publish(input: { routingKey: string }): Promise<void> {
    this.routingKeys.push(input.routingKey);
  }
}

type FakePayment = {
  amount: number;
  createdAt: Date;
  currency: string;
  failureReason: string | null;
  id: string;
  idempotencyKey: string;
  metadata: unknown | null;
  orderId: string;
  provider: 'MERCADO_PAGO' | 'MOCK' | 'STRIPE';
  providerPaymentId: string | null;
  requestHash: string;
  status: 'APPROVED' | 'CANCELLED' | 'PENDING' | 'REFUNDED' | 'REJECTED';
  updatedAt: Date;
  userId: string;
};

type FakePaymentEvent = {
  createdAt: Date;
  id: string;
  paymentId: string;
  payload: unknown;
  type: string;
};

class FakePaymentPrisma {
  readonly events: FakePaymentEvent[] = [];
  readonly payments: FakePayment[] = [];
  private sequence = 0;

  readonly payment = {
    create: async ({ data }: { data: Partial<FakePayment> }) => {
      const payment: FakePayment = {
        amount: required(data.amount),
        createdAt: new Date(),
        currency: required(data.currency),
        failureReason: data.failureReason ?? null,
        id: this.nextId(),
        idempotencyKey: required(data.idempotencyKey),
        metadata: data.metadata ?? null,
        orderId: required(data.orderId),
        provider: required(data.provider),
        providerPaymentId: data.providerPaymentId ?? null,
        requestHash: required(data.requestHash),
        status: data.status ?? 'PENDING',
        updatedAt: new Date(),
        userId: required(data.userId),
      };
      this.payments.push(payment);
      return clone(payment);
    },
    findFirst: async ({ where }: { where: { OR: Partial<FakePayment>[] } }) =>
      clone(
        this.payments.find((payment) =>
          where.OR.some((filter) =>
            Object.entries(filter).every(
              ([key, value]) => payment[key as keyof FakePayment] === value,
            ),
          ),
        ) ?? null,
      ),
  };

  readonly paymentEvent = {
    create: async ({ data }: { data: Omit<FakePaymentEvent, 'createdAt' | 'id'> }) => {
      const event: FakePaymentEvent = {
        ...data,
        createdAt: new Date(),
        id: this.nextId(),
      };
      this.events.push(event);
      return clone(event);
    },
  };

  async $transaction<TValue>(
    callback: (tx: FakePaymentPrisma) => Promise<TValue>,
  ): Promise<TValue> {
    return callback(this);
  }

  private nextId(): string {
    this.sequence += 1;
    return `${this.sequence.toString().padStart(12, '0')}-0000-4000-8000-000000000000`;
  }
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
