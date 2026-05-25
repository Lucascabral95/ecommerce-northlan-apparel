import { BadRequestException, ConflictException } from '@nestjs/common';
import { RequestPaymentCommandPayload } from '@northlane/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('processes Mercado Pago webhooks idempotently', async () => {
    config.providerMode = 'MERCADO_PAGO';
    config.mercadoPagoAccessToken = 'test-access-token';
    service = new PaymentService(config as never, prisma as never, rabbitMqClient as never);
    prisma.payments.push({
      amount: 180,
      approvedAt: null,
      cancelledAt: null,
      checkoutUrl: 'https://mercadopago.test/checkout',
      createdAt: new Date(),
      currency: 'ARS',
      expiredAt: null,
      expiresAt: null,
      externalReference: 'order-mp-1',
      failureReason: null,
      id: '000000000001-0000-4000-8000-000000000000',
      idempotencyKey: 'order-mp-1:payment',
      initPoint: 'https://mercadopago.test/checkout',
      metadata: null,
      orderId: 'order-mp-1',
      provider: 'MERCADO_PAGO',
      providerPaymentId: null,
      providerPreferenceId: 'pref-1',
      rawProviderStatus: 'preference_created',
      rejectedAt: null,
      requestHash: 'request-hash',
      sandboxInitPoint: null,
      status: 'PENDING',
      updatedAt: new Date(),
      userId: 'user-1',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({
        currency_id: 'ARS',
        external_reference: 'order-mp-1',
        id: 123,
        status: 'approved',
        transaction_amount: 180,
      }),
      ok: true,
    } as Response);

    const firstResult = await service.processWebhook(
      {
        body: { action: 'payment.updated', data: { id: '123' }, type: 'payment' },
        headers: { 'x-request-id': 'request-1' },
        query: {},
      },
      testContext(),
    );
    const secondResult = await service.processWebhook(
      {
        body: { action: 'payment.updated', data: { id: '123' }, type: 'payment' },
        headers: { 'x-request-id': 'request-1' },
        query: {},
      },
      testContext(),
    );

    expect(firstResult).toMatchObject({ status: 'APPROVED', providerPaymentId: '123' });
    expect(secondResult).toEqual({ ignored: true });
    expect(rabbitMqClient.routingKeys.filter((key) => key === 'payment.event.payment_succeeded')).toHaveLength(1);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
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
  mercadoPagoAccessToken: string | undefined;
  readonly mercadoPagoWebhookSecret = undefined;
  providerMode: 'MERCADO_PAGO' | 'MOCK' = 'MOCK';
}

class FakeRabbitMqClient {
  readonly routingKeys: string[] = [];

  async publish(input: { routingKey: string }): Promise<void> {
    this.routingKeys.push(input.routingKey);
  }
}

type FakePayment = {
  amount: number;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  checkoutUrl: string | null;
  createdAt: Date;
  currency: string;
  expiredAt: Date | null;
  expiresAt: Date | null;
  externalReference: string | null;
  failureReason: string | null;
  id: string;
  idempotencyKey: string;
  initPoint: string | null;
  metadata: unknown | null;
  orderId: string;
  provider: 'MERCADO_PAGO' | 'MOCK' | 'STRIPE';
  providerPaymentId: string | null;
  providerPreferenceId: string | null;
  rawProviderStatus: string | null;
  rejectedAt: Date | null;
  requestHash: string;
  sandboxInitPoint: string | null;
  status: 'APPROVED' | 'CANCELLED' | 'EXPIRED' | 'IN_PROCESS' | 'PENDING' | 'REFUNDED' | 'REJECTED';
  updatedAt: Date;
  userId: string;
};

type FakePaymentEvent = {
  createdAt: Date;
  eventType: string | null;
  id: string;
  paymentId: string;
  payload: unknown;
  processedAt: Date | null;
  provider: 'MERCADO_PAGO' | 'MOCK' | 'STRIPE' | null;
  providerEventId: string | null;
  type: string;
};

type FakeWebhookEvent = {
  action: string | null;
  createdAt: Date;
  deduplicationKey: string;
  id: string;
  payload: unknown;
  paymentId: string | null;
  processedAt: Date | null;
  provider: 'MERCADO_PAGO' | 'MOCK' | 'STRIPE';
  providerEventId: string | null;
  resourceId: string | null;
  signature: string | null;
  status: 'FAILED' | 'IGNORED' | 'PROCESSED' | 'PROCESSING' | 'RECEIVED';
  topic: string | null;
};

class FakePaymentPrisma {
  readonly events: FakePaymentEvent[] = [];
  readonly payments: FakePayment[] = [];
  readonly webhookEvents: FakeWebhookEvent[] = [];
  private sequence = 0;

  readonly payment = {
    create: async ({ data }: { data: Partial<FakePayment> }) => {
      const payment: FakePayment = {
        amount: required(data.amount),
        approvedAt: data.approvedAt ?? null,
        cancelledAt: data.cancelledAt ?? null,
        checkoutUrl: data.checkoutUrl ?? null,
        createdAt: new Date(),
        currency: required(data.currency),
        expiredAt: data.expiredAt ?? null,
        expiresAt: data.expiresAt ?? null,
        externalReference: data.externalReference ?? null,
        failureReason: data.failureReason ?? null,
        id: this.nextId(),
        idempotencyKey: required(data.idempotencyKey),
        initPoint: data.initPoint ?? null,
        metadata: data.metadata ?? null,
        orderId: required(data.orderId),
        provider: required(data.provider),
        providerPaymentId: data.providerPaymentId ?? null,
        providerPreferenceId: data.providerPreferenceId ?? null,
        rawProviderStatus: data.rawProviderStatus ?? null,
        rejectedAt: data.rejectedAt ?? null,
        requestHash: required(data.requestHash),
        sandboxInitPoint: data.sandboxInitPoint ?? null,
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
    update: async ({ data, where }: { data: Partial<FakePayment>; where: { id: string } }) => {
      const payment = required(this.payments.find((candidate) => candidate.id === where.id));
      Object.assign(payment, data, { updatedAt: new Date() });
      return clone(payment);
    },
  };

  readonly paymentEvent = {
    create: async ({ data }: { data: Omit<FakePaymentEvent, 'createdAt' | 'id'> }) => {
      const event: FakePaymentEvent = {
        ...data,
        createdAt: new Date(),
        eventType: data.eventType ?? null,
        id: this.nextId(),
        processedAt: data.processedAt ?? null,
        provider: data.provider ?? null,
        providerEventId: data.providerEventId ?? null,
      };
      this.events.push(event);
      return clone(event);
    },
  };

  readonly webhookEvent = {
    create: async ({
      data,
    }: {
      data: Omit<FakeWebhookEvent, 'createdAt' | 'id' | 'paymentId' | 'processedAt'> &
        Partial<Pick<FakeWebhookEvent, 'paymentId' | 'processedAt'>>;
    }) => {
      const event: FakeWebhookEvent = {
        ...data,
        action: data.action ?? null,
        createdAt: new Date(),
        id: this.nextId(),
        paymentId: data.paymentId ?? null,
        processedAt: data.processedAt ?? null,
        providerEventId: data.providerEventId ?? null,
        resourceId: data.resourceId ?? null,
        signature: data.signature ?? null,
        topic: data.topic ?? null,
      };
      this.webhookEvents.push(event);
      return clone(event);
    },
    findUnique: async ({ where }: { where: { deduplicationKey: string } }) =>
      clone(
        this.webhookEvents.find((event) => event.deduplicationKey === where.deduplicationKey) ??
          null,
      ),
    update: async ({
      data,
      where,
    }: {
      data: Partial<FakeWebhookEvent>;
      where: { id: string };
    }) => {
      const event = required(this.webhookEvents.find((candidate) => candidate.id === where.id));
      Object.assign(event, data);
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
