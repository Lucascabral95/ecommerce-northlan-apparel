import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  MessageEnvelope,
  OrderConfirmedEvent,
  OrderCreatedEvent,
  OrderStatusChangedEventPayload,
  PaymentFailedEvent,
  PaymentSucceededEvent,
  QUEUE_NAMES,
  ROUTING_KEYS,
  UserRegisteredEvent,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { NotificationService } from './notification.service';

type OrderNotificationEvent =
  | MessageEnvelope<OrderStatusChangedEventPayload, typeof ROUTING_KEYS.orderEventOrderCancelled>
  | OrderConfirmedEvent
  | OrderCreatedEvent;
type PaymentNotificationEvent = PaymentFailedEvent | PaymentSucceededEvent;
type AuthNotificationEvent = UserRegisteredEvent;

@Injectable()
export class NotificationMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.subscribeToAuthEvents();
    await this.subscribeToOrderEvents();
    await this.subscribeToPaymentEvents();
  }

  private async subscribeToAuthEvents(): Promise<void> {
    await this.rabbitMqClient.subscribe<AuthNotificationEvent>(
      {
        deadLetter: notificationDeadLetter(),
        exchange: EXCHANGE_NAMES.auth,
        queue: QUEUE_NAMES.notificationEvents,
        routingKeys: [ROUTING_KEYS.authEventUserRegistered],
      },
      async (event) => this.notificationService.handleEvent(event),
    );
  }

  private async subscribeToOrderEvents(): Promise<void> {
    await this.rabbitMqClient.subscribe<OrderNotificationEvent>(
      {
        deadLetter: notificationDeadLetter(),
        exchange: EXCHANGE_NAMES.order,
        queue: QUEUE_NAMES.notificationEvents,
        routingKeys: [
          ROUTING_KEYS.orderEventOrderCancelled,
          ROUTING_KEYS.orderEventOrderConfirmed,
          ROUTING_KEYS.orderEventOrderCreated,
        ],
      },
      async (event) => this.notificationService.handleEvent(event),
    );
  }

  private async subscribeToPaymentEvents(): Promise<void> {
    await this.rabbitMqClient.subscribe<PaymentNotificationEvent>(
      {
        deadLetter: notificationDeadLetter(),
        exchange: EXCHANGE_NAMES.payment,
        queue: QUEUE_NAMES.notificationEvents,
        routingKeys: [
          ROUTING_KEYS.paymentEventPaymentFailed,
          ROUTING_KEYS.paymentEventPaymentSucceeded,
        ],
      },
      async (event) => this.notificationService.handleEvent(event),
    );
  }
}

function notificationDeadLetter() {
  return {
    exchange: EXCHANGE_NAMES.notificationDeadLetter,
    queue: QUEUE_NAMES.notificationDeadLetters,
    routingKey: 'notification.event.failed',
  };
}
