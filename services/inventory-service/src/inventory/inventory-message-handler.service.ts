import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  AdjustStockCommand,
  ConfirmStockReservationCommand,
  EXCHANGE_NAMES,
  QUEUE_NAMES,
  ReleaseStockReservationCommand,
  ReserveStockCommand,
  ROUTING_KEYS,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { InventoryService } from './inventory.service';

const RETRY_DELAY_MS = 5_000;
const MAX_RETRY_ATTEMPTS = 3;

type InventoryCommand =
  | AdjustStockCommand
  | ConfirmStockReservationCommand
  | ReleaseStockReservationCommand
  | ReserveStockCommand;

@Injectable()
export class InventoryMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMqClient.subscribe<InventoryCommand>(
      {
        deadLetter: inventoryDeadLetter(),
        exchange: EXCHANGE_NAMES.inventory,
        queue: QUEUE_NAMES.inventoryCommands,
        retry: {
          delayMs: RETRY_DELAY_MS,
          exchange: EXCHANGE_NAMES.inventoryRetry,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          queue: QUEUE_NAMES.inventoryRetry,
          routingKey: 'inventory.command.retry',
        },
        routingKeys: [
          ROUTING_KEYS.inventoryCommandAdjustStock,
          ROUTING_KEYS.inventoryCommandConfirmStock,
          ROUTING_KEYS.inventoryCommandReleaseStock,
          ROUTING_KEYS.inventoryCommandReserveStock,
        ],
      },
      async (command) => {
        const context = {
          causationId: command.eventId,
          correlationId: command.correlationId,
        };

        if (command.type === ROUTING_KEYS.inventoryCommandReserveStock) {
          return this.inventoryService.reserveStock(command.payload, context);
        }

        if (command.type === ROUTING_KEYS.inventoryCommandConfirmStock) {
          return this.inventoryService.confirmStockReservation(command.payload, context);
        }

        if (command.type === ROUTING_KEYS.inventoryCommandReleaseStock) {
          return this.inventoryService.releaseStockReservation(command.payload, context);
        }

        if (command.type === ROUTING_KEYS.inventoryCommandAdjustStock) {
          return this.inventoryService.adjustStock(command.payload, context);
        }

        throw new Error('Unsupported inventory command.');
      },
    );
  }
}

function inventoryDeadLetter() {
  return {
    exchange: EXCHANGE_NAMES.inventoryDeadLetter,
    queue: QUEUE_NAMES.inventoryDeadLetters,
    routingKey: 'inventory.command.failed',
  };
}
