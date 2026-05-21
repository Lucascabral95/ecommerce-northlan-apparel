import {
  MessageEnvelope,
  OrderCreatedEventPayload,
  PaymentFailedEventPayload,
  PaymentSucceededEventPayload,
  ROUTING_KEYS,
  UserRegisteredEventPayload,
} from '@northlane/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let prisma: FakeNotificationPrisma;
  let service: NotificationService;

  beforeEach(() => {
    prisma = new FakeNotificationPrisma();
    service = new NotificationService(prisma as never);
  });

  it('stores and logs a welcome email for user registration', async () => {
    const notification = await service.handleEvent(
      testEvent<UserRegisteredEventPayload, typeof ROUTING_KEYS.authEventUserRegistered>(
        ROUTING_KEYS.authEventUserRegistered,
        {
          email: 'lucas@northlane.test',
          firstName: 'Lucas',
          lastName: 'Rivera',
          role: 'USER',
          userId: 'user-1',
        },
      ),
    );

    expect(notification).toMatchObject({
      channel: 'EMAIL',
      status: 'SENT',
      subject: 'Welcome to Northlane Apparel',
      type: 'auth.event.user_registered',
      userId: 'user-1',
    });
    expect(notification.content).toContain('Lucas Rivera');
    expect(prisma.notifications).toHaveLength(1);
    expect(prisma.notifications[0]?.sentAt).toBeInstanceOf(Date);
  });

  it('stores an order created notification', async () => {
    const notification = await service.handleEvent(
      testEvent<OrderCreatedEventPayload, typeof ROUTING_KEYS.orderEventOrderCreated>(
        ROUTING_KEYS.orderEventOrderCreated,
        {
          grandTotal: 180,
          orderId: 'order-1',
          orderNumber: 'NLA-20260521-ABC12345',
          userId: 'user-1',
        },
      ),
    );

    expect(notification.subject).toBe('Order NLA-20260521-ABC12345 received');
    expect(notification.content).toContain('180');
    expect(prisma.notifications[0]?.metadata).toMatchObject({
      orderId: 'order-1',
      sourceEventType: 'order.event.order_created',
    });
  });

  it('stores payment success and failure notifications', async () => {
    const success = await service.handleEvent(
      testEvent<PaymentSucceededEventPayload, typeof ROUTING_KEYS.paymentEventPaymentSucceeded>(
        ROUTING_KEYS.paymentEventPaymentSucceeded,
        {
          amount: 180,
          currency: 'USD',
          idempotencyKey: 'order-1:payment',
          orderId: 'order-1',
          paymentId: 'payment-1',
          provider: 'MOCK',
          providerPaymentId: 'mock_1',
          userId: 'user-1',
        },
      ),
    );
    const failure = await service.handleEvent(
      testEvent<PaymentFailedEventPayload, typeof ROUTING_KEYS.paymentEventPaymentFailed>(
        ROUTING_KEYS.paymentEventPaymentFailed,
        {
          amount: 180,
          currency: 'USD',
          failureReason: 'Mock payment failure requested by metadata.',
          idempotencyKey: 'order-2:payment',
          orderId: 'order-2',
          paymentId: 'payment-2',
          provider: 'MOCK',
          userId: 'user-1',
        },
      ),
    );

    expect(success.subject).toBe('Payment approved');
    expect(failure.subject).toBe('Payment rejected');
    expect(failure.content).toContain('Mock payment failure requested by metadata.');
    expect(prisma.notifications).toHaveLength(2);
  });

  it('stores order confirmed and cancelled notifications', async () => {
    const confirmed = await service.handleEvent(
      testEvent(ROUTING_KEYS.orderEventOrderConfirmed, {
        orderId: 'order-1',
        orderNumber: 'NLA-20260521-ABC12345',
        status: 'CONFIRMED',
        userId: 'user-1',
      }),
    );
    const cancelled = await service.handleEvent(
      testEvent(ROUTING_KEYS.orderEventOrderCancelled, {
        orderId: 'order-2',
        orderNumber: 'NLA-20260521-XYZ98765',
        status: 'CANCELLED',
        userId: 'user-1',
      }),
    );

    expect(confirmed.subject).toBe('Order NLA-20260521-ABC12345 confirmed');
    expect(cancelled.subject).toBe('Order NLA-20260521-XYZ98765 cancelled');
    expect(prisma.notifications).toHaveLength(2);
  });
});

function testEvent<TPayload, TType extends string>(
  type: TType,
  payload: TPayload,
): MessageEnvelope<TPayload, TType> {
  return {
    correlationId: 'test-correlation',
    eventId: 'test-event',
    payload,
    producer: 'test-producer',
    timestamp: new Date().toISOString(),
    type,
    version: 1,
  };
}

type FakeNotification = {
  channel: 'EMAIL';
  content: string;
  createdAt: Date;
  id: string;
  metadata: unknown | null;
  sentAt: Date | null;
  status: 'FAILED' | 'PENDING' | 'SENT';
  subject: string;
  type: string;
  userId: string;
};

class FakeNotificationPrisma {
  readonly notifications: FakeNotification[] = [];
  private sequence = 0;

  readonly notification = {
    create: async ({ data }: { data: Partial<FakeNotification> }) => {
      const notification: FakeNotification = {
        channel: data.channel ?? 'EMAIL',
        content: required(data.content),
        createdAt: new Date(),
        id: this.nextId(),
        metadata: data.metadata ?? null,
        sentAt: data.sentAt ?? null,
        status: data.status ?? 'PENDING',
        subject: required(data.subject),
        type: required(data.type),
        userId: required(data.userId),
      };
      this.notifications.push(notification);
      return structuredClone(notification);
    },
  };

  private nextId(): string {
    this.sequence += 1;
    return `${this.sequence.toString().padStart(12, '0')}-0000-4000-8000-000000000000`;
  }
}

function required<TValue>(value: TValue | null | undefined): TValue {
  if (value === undefined || value === null) {
    throw new Error('Expected value to be present.');
  }

  return value;
}
