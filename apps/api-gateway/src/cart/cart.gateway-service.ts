import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AddCartItemCommandPayload,
  CartDto,
  EXCHANGE_NAMES,
  RemoveCartItemCommandPayload,
  ROUTING_KEYS,
  UpdateCartItemCommandPayload,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createGatewayCommandEnvelope } from '../messaging/command-envelope';

type CartRoutingKey =
  | typeof ROUTING_KEYS.cartCommandAddItem
  | typeof ROUTING_KEYS.cartCommandClearCart
  | typeof ROUTING_KEYS.cartCommandGetCart
  | typeof ROUTING_KEYS.cartCommandRemoveItem
  | typeof ROUTING_KEYS.cartCommandUpdateItem;

@Injectable()
export class CartGatewayService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  getCart(userId: string, correlationId: string): Promise<CartDto> {
    return this.requestCart(ROUTING_KEYS.cartCommandGetCart, { userId }, correlationId);
  }

  addItem(payload: AddCartItemCommandPayload, correlationId: string): Promise<CartDto> {
    return this.requestCart(ROUTING_KEYS.cartCommandAddItem, payload, correlationId);
  }

  updateItem(payload: UpdateCartItemCommandPayload, correlationId: string): Promise<CartDto> {
    return this.requestCart(ROUTING_KEYS.cartCommandUpdateItem, payload, correlationId);
  }

  removeItem(payload: RemoveCartItemCommandPayload, correlationId: string): Promise<CartDto> {
    return this.requestCart(ROUTING_KEYS.cartCommandRemoveItem, payload, correlationId);
  }

  clearCart(userId: string, correlationId: string): Promise<CartDto> {
    return this.requestCart(ROUTING_KEYS.cartCommandClearCart, { userId }, correlationId);
  }

  private async requestCart<TPayload>(
    routingKey: CartRoutingKey,
    payload: TPayload,
    correlationId: string,
  ): Promise<CartDto> {
    try {
      return await this.rabbitMqClient.request<CartDto>({
        correlationId,
        exchange: EXCHANGE_NAMES.cart,
        message: createGatewayCommandEnvelope(routingKey, payload, correlationId),
        routingKey,
      });
    } catch (error) {
      throw mapRpcError(error);
    }
  }
}

function mapRpcError(error: unknown): Error {
  const candidate = error as Error & { code?: unknown };
  if (candidate.code === 'BAD_REQUEST') {
    return new BadRequestException(candidate.message);
  }

  if (candidate.code === 'CONFLICT') {
    return new ConflictException(candidate.message);
  }

  if (candidate.code === 'NOT_FOUND') {
    return new NotFoundException(candidate.message);
  }

  return candidate instanceof Error ? candidate : new Error('Cart service request failed.');
}
