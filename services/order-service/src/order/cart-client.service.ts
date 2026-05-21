import { Injectable } from '@nestjs/common';
import { CartDto, EXCHANGE_NAMES, ROUTING_KEYS } from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createOrderMessageEnvelope, MessageContext } from './order.events';

@Injectable()
export class CartClientService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  async getActiveCart(userId: string, context: MessageContext): Promise<CartDto> {
    return this.rabbitMqClient.request<CartDto>({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.cart,
      message: createOrderMessageEnvelope(ROUTING_KEYS.cartCommandGetCart, { userId }, context),
      routingKey: ROUTING_KEYS.cartCommandGetCart,
    });
  }
}
