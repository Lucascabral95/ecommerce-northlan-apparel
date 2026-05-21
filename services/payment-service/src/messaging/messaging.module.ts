import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { PaymentServiceConfigService } from '../config/payment-service.config';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [PaymentServiceConfigService],
      provide: RabbitMqClient,
      useFactory: (config: PaymentServiceConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
