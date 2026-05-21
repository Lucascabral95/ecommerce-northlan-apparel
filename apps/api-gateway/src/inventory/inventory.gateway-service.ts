import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdjustStockCommandPayload, EXCHANGE_NAMES, InventoryItemDto, ROUTING_KEYS } from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createGatewayCommandEnvelope } from '../messaging/command-envelope';
import { AdjustProductStockRequestDto } from '../products/products.dto';

@Injectable()
export class InventoryGatewayService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  adjustProductStock(
    productId: string,
    payload: AdjustProductStockRequestDto,
    correlationId: string,
  ): Promise<InventoryItemDto> {
    return this.requestInventory(
      {
        idempotencyKey: payload.idempotencyKey,
        mode: payload.mode ?? 'SET',
        productId,
        quantity: payload.quantity,
        reason: payload.reason ?? 'Admin stock adjustment.',
        sku: payload.sku,
        variantId: payload.variantId,
      },
      correlationId,
    );
  }

  private async requestInventory(
    payload: AdjustStockCommandPayload,
    correlationId: string,
  ): Promise<InventoryItemDto> {
    try {
      return await this.rabbitMqClient.request<InventoryItemDto>({
        correlationId,
        exchange: EXCHANGE_NAMES.inventory,
        message: createGatewayCommandEnvelope(ROUTING_KEYS.inventoryCommandAdjustStock, payload, correlationId),
        routingKey: ROUTING_KEYS.inventoryCommandAdjustStock,
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

  return candidate instanceof Error ? candidate : new Error('Inventory service request failed.');
}
