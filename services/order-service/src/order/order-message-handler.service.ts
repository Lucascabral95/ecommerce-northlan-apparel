import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  CreateOrderCommand,
  CreateCheckoutSessionCommand,
  EXCHANGE_NAMES,
  GetOrderCommand,
  ListOrdersCommand,
  PaymentCancelledEvent,
  PaymentExpiredEvent,
  PaymentFailedEvent,
  PaymentPendingEvent,
  PaymentRejectedEvent,
  PaymentSucceededEvent,
  QUEUE_NAMES,
  ROUTING_KEYS,
  StockReservationFailedEvent,
  StockReservedEvent,
  UpdateOrderStatusCommand,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { OrderService } from './order.service';

type OrderCommand =
  | CreateCheckoutSessionCommand
  | CreateOrderCommand
  | GetOrderCommand
  | ListOrdersCommand
  | UpdateOrderStatusCommand;
type InventoryReservationEvent = StockReservationFailedEvent | StockReservedEvent;
type PaymentEvent =
  | PaymentCancelledEvent
  | PaymentExpiredEvent
  | PaymentFailedEvent
  | PaymentPendingEvent
  | PaymentRejectedEvent
  | PaymentSucceededEvent;

const RETRY_DELAY_MS = 5_000;
const MAX_RETRY_ATTEMPTS = 3;

@Injectable()
export class OrderMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly orderService: OrderService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.subscribeToOrderCommands();
    await this.subscribeToInventoryEvents();
    await this.subscribeToPaymentEvents();
  }

  private async subscribeToOrderCommands(): Promise<void> {
    await this.rabbitMqClient.subscribe<OrderCommand>(
      {
        deadLetter: orderDeadLetter(),
        exchange: EXCHANGE_NAMES.order,
        queue: QUEUE_NAMES.orderCommands,
        retry: {
          delayMs: RETRY_DELAY_MS,
          exchange: EXCHANGE_NAMES.orderRetry,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          queue: QUEUE_NAMES.orderCommandRetry,
          routingKey: 'order.command.retry',
        },
        routingKeys: [
          ROUTING_KEYS.orderCommandCreateOrder,
          ROUTING_KEYS.orderCommandCreateCheckoutSession,
          ROUTING_KEYS.orderCommandGetOrder,
          ROUTING_KEYS.orderCommandListOrders,
          ROUTING_KEYS.orderCommandUpdateStatus,
        ],
      },
      async (command) => {
        const context = {
          causationId: command.eventId,
          correlationId: command.correlationId,
        };

        if (command.type === ROUTING_KEYS.orderCommandCreateOrder) {
          return this.orderService.createOrder(command.payload, context);
        }

        if (command.type === ROUTING_KEYS.orderCommandCreateCheckoutSession) {
          return this.orderService.createCheckoutSession(command.payload, context);
        }

        if (command.type === ROUTING_KEYS.orderCommandListOrders) {
          return this.orderService.listOrders(command.payload);
        }

        if (command.type === ROUTING_KEYS.orderCommandGetOrder) {
          return this.orderService.getOrder(command.payload);
        }

        if (command.type === ROUTING_KEYS.orderCommandUpdateStatus) {
          return this.orderService.updateOrderStatus(command.payload, context);
        }

        throw new Error('Unsupported order command.');
      },
    );
  }

  private async subscribeToInventoryEvents(): Promise<void> {
    await this.rabbitMqClient.subscribe<InventoryReservationEvent>(
      {
        deadLetter: orderDeadLetter(),
        exchange: EXCHANGE_NAMES.inventory,
        queue: QUEUE_NAMES.orderInventoryEvents,
        retry: {
          delayMs: RETRY_DELAY_MS,
          exchange: EXCHANGE_NAMES.orderRetry,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          queue: QUEUE_NAMES.orderInventoryEventRetry,
          routingKey: 'order.inventory_event.retry',
        },
        routingKeys: [
          ROUTING_KEYS.inventoryEventStockReservationFailed,
          ROUTING_KEYS.inventoryEventStockReserved,
        ],
      },
      async (event) => {
        const context = {
          causationId: event.eventId,
          correlationId: event.correlationId,
        };

        if (event.type === ROUTING_KEYS.inventoryEventStockReserved) {
          await this.orderService.handleStockReserved(event.payload, context);
          return { handled: true };
        }

        if (event.type === ROUTING_KEYS.inventoryEventStockReservationFailed) {
          await this.orderService.handleStockReservationFailed(event.payload, context);
          return { handled: true };
        }

        throw new Error('Unsupported inventory reservation event.');
      },
    );
  }

  private async subscribeToPaymentEvents(): Promise<void> {
    await this.rabbitMqClient.subscribe<PaymentEvent>(
      {
        deadLetter: orderDeadLetter(),
        exchange: EXCHANGE_NAMES.payment,
        queue: QUEUE_NAMES.orderPaymentEvents,
        retry: {
          delayMs: RETRY_DELAY_MS,
          exchange: EXCHANGE_NAMES.orderRetry,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          queue: QUEUE_NAMES.orderPaymentEventRetry,
          routingKey: 'order.payment_event.retry',
        },
        routingKeys: [
          ROUTING_KEYS.paymentEventPaymentFailed,
          ROUTING_KEYS.paymentEventPaymentCancelled,
          ROUTING_KEYS.paymentEventPaymentExpired,
          ROUTING_KEYS.paymentEventPaymentPending,
          ROUTING_KEYS.paymentEventPaymentRejected,
          ROUTING_KEYS.paymentEventPaymentSucceeded,
        ],
      },
      async (event) => {
        const context = {
          causationId: event.eventId,
          correlationId: event.correlationId,
        };

        if (event.type === ROUTING_KEYS.paymentEventPaymentSucceeded) {
          await this.orderService.handlePaymentSucceeded(event.payload, context);
          return { handled: true };
        }

        if (event.type === ROUTING_KEYS.paymentEventPaymentPending) {
          await this.orderService.handlePaymentPending(event.payload, context);
          return { handled: true };
        }

        if (
          event.type === ROUTING_KEYS.paymentEventPaymentCancelled ||
          event.type === ROUTING_KEYS.paymentEventPaymentExpired ||
          event.type === ROUTING_KEYS.paymentEventPaymentFailed ||
          event.type === ROUTING_KEYS.paymentEventPaymentRejected
        ) {
          await this.orderService.handlePaymentFailed(event.payload, context);
          return { handled: true };
        }

        throw new Error('Unsupported payment event.');
      },
    );
  }
}

function orderDeadLetter() {
  return {
    exchange: EXCHANGE_NAMES.orderDeadLetter,
    queue: QUEUE_NAMES.orderDeadLetters,
    routingKey: 'order.message.failed',
  };
}
