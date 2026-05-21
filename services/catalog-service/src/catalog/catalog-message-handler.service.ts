import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  CreateProductCommand,
  EXCHANGE_NAMES,
  GetCategoriesCommand,
  GetProductCommand,
  ListProductsCommand,
  QUEUE_NAMES,
  ROUTING_KEYS,
  UpdateProductCommand,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { CatalogService } from './catalog.service';

@Injectable()
export class CatalogMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMqClient.subscribe<
      CreateProductCommand | GetCategoriesCommand | GetProductCommand | ListProductsCommand | UpdateProductCommand
    >(
      {
        exchange: EXCHANGE_NAMES.catalog,
        queue: QUEUE_NAMES.catalogCommands,
        routingKeys: [
          ROUTING_KEYS.catalogCommandCreateProduct,
          ROUTING_KEYS.catalogCommandGetCategories,
          ROUTING_KEYS.catalogCommandGetProduct,
          ROUTING_KEYS.catalogCommandListProducts,
          ROUTING_KEYS.catalogCommandUpdateProduct,
        ],
      },
      async (command) => {
        if (command.type === ROUTING_KEYS.catalogCommandListProducts) {
          return this.catalogService.listProducts(command.payload);
        }

        if (command.type === ROUTING_KEYS.catalogCommandGetProduct) {
          return this.catalogService.getProduct(command.payload);
        }

        if (command.type === ROUTING_KEYS.catalogCommandGetCategories) {
          return this.catalogService.listCategories(command.payload.includeInactive ?? false);
        }

        if (command.type === ROUTING_KEYS.catalogCommandCreateProduct) {
          return this.catalogService.createProduct(command.payload);
        }

        if (command.type === ROUTING_KEYS.catalogCommandUpdateProduct) {
          return this.catalogService.updateProduct(command.payload);
        }

        throw new Error('Unsupported catalog command.');
      },
    );
  }
}
