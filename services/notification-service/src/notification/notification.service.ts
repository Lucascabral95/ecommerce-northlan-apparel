import { Injectable } from '@nestjs/common';
import {
  MessageEnvelope,
  OrderConfirmedEvent,
  OrderCreatedEvent,
  OrderStatusChangedEventPayload,
  PaymentFailedEvent,
  PaymentFailedEventPayload,
  PaymentSucceededEvent,
  PaymentSucceededEventPayload,
  ROUTING_KEYS,
  UserRegisteredEvent,
  UserRegisteredEventPayload,
} from '@northlane/contracts';
import { JsonLogger } from '@northlane/shared';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { mapNotification, NotificationDto } from './notification.mapper';

type SupportedNotificationEvent =
  | MessageEnvelope<OrderStatusChangedEventPayload, typeof ROUTING_KEYS.orderEventOrderCancelled>
  | OrderConfirmedEvent
  | OrderCreatedEvent
  | PaymentFailedEvent
  | PaymentSucceededEvent
  | UserRegisteredEvent;

type NotificationDraft = Readonly<{
  content: string;
  metadata: Record<string, unknown>;
  subject: string;
  type: string;
  userId: string;
}>;

@Injectable()
export class NotificationService {
  private readonly logger = new JsonLogger('notification-service');

  constructor(private readonly prisma: PrismaService) {}

  async handleEvent(event: SupportedNotificationEvent): Promise<NotificationDto> {
    const draft = createNotificationDraft(event);
    const notification = await this.prisma.notification.create({
      data: {
        channel: 'EMAIL',
        content: draft.content,
        metadata: draft.metadata as Prisma.InputJsonValue,
        sentAt: new Date(),
        status: 'SENT',
        subject: draft.subject,
        type: draft.type,
        userId: draft.userId,
      },
    });

    this.logger.writeWithContext('info', 'Simulated email notification sent.', {
      context: 'NotificationService',
      correlationId: event.correlationId,
      metadata: {
        channel: notification.channel,
        notificationId: notification.id,
        subject: notification.subject,
        type: notification.type,
        userId: notification.userId,
      },
    });

    return mapNotification(notification);
  }
}

function createNotificationDraft(event: SupportedNotificationEvent): NotificationDraft {
  if (event.type === ROUTING_KEYS.authEventUserRegistered) {
    return userRegisteredDraft(event.payload, event);
  }

  if (event.type === ROUTING_KEYS.orderEventOrderCreated) {
    return orderCreatedDraft(event.payload, event);
  }

  if (event.type === ROUTING_KEYS.paymentEventPaymentSucceeded) {
    return paymentSucceededDraft(event.payload, event);
  }

  if (event.type === ROUTING_KEYS.paymentEventPaymentFailed) {
    return paymentFailedDraft(event.payload, event);
  }

  if (event.type === ROUTING_KEYS.orderEventOrderConfirmed) {
    return orderStatusDraft(event.payload, event, {
      content: `Your order ${event.payload.orderNumber} has been confirmed and is being prepared.`,
      subject: `Order ${event.payload.orderNumber} confirmed`,
    });
  }

  if (event.type === ROUTING_KEYS.orderEventOrderCancelled) {
    return orderStatusDraft(event.payload, event, {
      content: `Your order ${event.payload.orderNumber} was cancelled. If this was unexpected, contact support.`,
      subject: `Order ${event.payload.orderNumber} cancelled`,
    });
  }

  throw new Error('Unsupported notification event.');
}

function userRegisteredDraft(
  payload: UserRegisteredEventPayload,
  event: SupportedNotificationEvent,
): NotificationDraft {
  const name = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim();
  return {
    content: `Welcome${name ? ` ${name}` : ''} to Northlane Apparel. Your account is ready.`,
    metadata: baseMetadata(event, { email: payload.email, role: payload.role }),
    subject: 'Welcome to Northlane Apparel',
    type: event.type,
    userId: payload.userId,
  };
}

function orderCreatedDraft(
  payload: OrderCreatedEvent['payload'],
  event: SupportedNotificationEvent,
): NotificationDraft {
  return {
    content: `We received your order ${payload.orderNumber} for ${payload.grandTotal}.`,
    metadata: baseMetadata(event, {
      grandTotal: payload.grandTotal,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
    }),
    subject: `Order ${payload.orderNumber} received`,
    type: event.type,
    userId: payload.userId,
  };
}

function paymentSucceededDraft(
  payload: PaymentSucceededEventPayload,
  event: SupportedNotificationEvent,
): NotificationDraft {
  return {
    content: `Payment ${payload.providerPaymentId} for order ${payload.orderId} was approved.`,
    metadata: baseMetadata(event, {
      amount: payload.amount,
      currency: payload.currency,
      orderId: payload.orderId,
      paymentId: payload.paymentId,
      provider: payload.provider,
      providerPaymentId: payload.providerPaymentId,
    }),
    subject: 'Payment approved',
    type: event.type,
    userId: payload.userId,
  };
}

function paymentFailedDraft(
  payload: PaymentFailedEventPayload,
  event: SupportedNotificationEvent,
): NotificationDraft {
  return {
    content: `Payment for order ${payload.orderId} was rejected: ${payload.failureReason}.`,
    metadata: baseMetadata(event, {
      amount: payload.amount,
      currency: payload.currency,
      failureReason: payload.failureReason,
      orderId: payload.orderId,
      paymentId: payload.paymentId,
      provider: payload.provider,
    }),
    subject: 'Payment rejected',
    type: event.type,
    userId: payload.userId,
  };
}

function orderStatusDraft(
  payload: OrderStatusChangedEventPayload,
  event: SupportedNotificationEvent,
  text: Readonly<{ content: string; subject: string }>,
): NotificationDraft {
  return {
    content: text.content,
    metadata: baseMetadata(event, {
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      status: payload.status,
    }),
    subject: text.subject,
    type: event.type,
    userId: payload.userId,
  };
}

function baseMetadata(
  event: SupportedNotificationEvent,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...metadata,
    causationId: event.causationId,
    correlationId: event.correlationId,
    eventId: event.eventId,
    producer: event.producer,
    sourceEventType: event.type,
  };
}
