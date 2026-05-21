import { Injectable, OnModuleInit } from '@nestjs/common';
import { CartCommand, EXCHANGE_NAMES, QUEUE_NAMES, ROUTING_KEYS } from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { CartService } from './cart.service';

@Injectable()
export class CartMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly cartService: CartService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMqClient.subscribe<CartCommand>(
      {
        exchange: EXCHANGE_NAMES.cart,
        queue: QUEUE_NAMES.cartCommands,
        routingKeys: [
          ROUTING_KEYS.cartCommandAddItem,
          ROUTING_KEYS.cartCommandClearCart,
          ROUTING_KEYS.cartCommandGetCart,
          ROUTING_KEYS.cartCommandRemoveItem,
          ROUTING_KEYS.cartCommandUpdateItem,
        ],
      },
      async (command) => {
        const context = {
          causationId: command.eventId,
          correlationId: command.correlationId,
        };

        if (command.type === ROUTING_KEYS.cartCommandGetCart) {
          return this.cartService.getActiveCart(command.payload);
        }

        if (command.type === ROUTING_KEYS.cartCommandAddItem) {
          return this.cartService.addItem(command.payload, context);
        }

        if (command.type === ROUTING_KEYS.cartCommandUpdateItem) {
          return this.cartService.updateItem(command.payload);
        }

        if (command.type === ROUTING_KEYS.cartCommandRemoveItem) {
          return this.cartService.removeItem(command.payload);
        }

        if (command.type === ROUTING_KEYS.cartCommandClearCart) {
          return this.cartService.clearCart(command.payload);
        }

        throw new Error('Unsupported cart command.');
      },
    );
  }
}
