import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { InventoryServiceConfigService } from '../config/inventory-service.config';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [InventoryServiceConfigService],
      provide: RabbitMqClient,
      useFactory: (config: InventoryServiceConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
