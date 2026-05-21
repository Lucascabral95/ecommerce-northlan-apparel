import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { OrderServiceConfigService } from '../config/order-service.config';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [OrderServiceConfigService],
      provide: RabbitMqClient,
      useFactory: (config: OrderServiceConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
