import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  CreateOrderCommand,
  EXCHANGE_NAMES,
  GetOrderCommand,
  ListOrdersCommand,
  QUEUE_NAMES,
  ROUTING_KEYS,
  StockReservationFailedEvent,
  StockReservedEvent,
  UpdateOrderStatusCommand,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { OrderService } from './order.service';

type OrderCommand =
  | CreateOrderCommand
  | GetOrderCommand
  | ListOrdersCommand
  | UpdateOrderStatusCommand;
type InventoryReservationEvent = StockReservationFailedEvent | StockReservedEvent;

@Injectable()
export class OrderMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly orderService: OrderService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.subscribeToOrderCommands();
    await this.subscribeToInventoryEvents();
  }

  private async subscribeToOrderCommands(): Promise<void> {
    await this.rabbitMqClient.subscribe<OrderCommand>(
      {
        exchange: EXCHANGE_NAMES.order,
        queue: QUEUE_NAMES.orderCommands,
        routingKeys: [
          ROUTING_KEYS.orderCommandCreateOrder,
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
        exchange: EXCHANGE_NAMES.inventory,
        queue: QUEUE_NAMES.orderEvents,
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
}
