import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { CatalogServiceConfigService } from '../config/catalog-service.config';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [CatalogServiceConfigService],
      provide: RabbitMqClient,
      useFactory: (config: CatalogServiceConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
