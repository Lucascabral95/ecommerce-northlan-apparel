import { Injectable, NotFoundException } from '@nestjs/common';
import { EXCHANGE_NAMES, ProductDto, ROUTING_KEYS } from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { MessageContext, createCartCommandEnvelope } from './cart.events';

@Injectable()
export class CatalogClientService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  async getProductById(productId: string, context: MessageContext): Promise<ProductDto> {
    try {
      return await this.rabbitMqClient.request<ProductDto>({
        correlationId: context.correlationId,
        exchange: EXCHANGE_NAMES.catalog,
        message: createCartCommandEnvelope(ROUTING_KEYS.catalogCommandGetProduct, { productId }, context),
        routingKey: ROUTING_KEYS.catalogCommandGetProduct,
      });
    } catch (error) {
      const candidate = error as Error & { code?: unknown };
      if (candidate.code === 'NOT_FOUND') {
        throw new NotFoundException('Product was not found.');
      }

      throw candidate instanceof Error ? candidate : new Error('Catalog service request failed.');
    }
  }
}
