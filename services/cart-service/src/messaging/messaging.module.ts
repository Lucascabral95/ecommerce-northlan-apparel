import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { CartServiceConfigService } from '../config/cart-service.config';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [CartServiceConfigService],
      provide: RabbitMqClient,
      useFactory: (config: CartServiceConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
