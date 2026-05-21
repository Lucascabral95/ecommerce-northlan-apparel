import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { NotificationServiceConfigService } from '../config/notification-service.config';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [NotificationServiceConfigService],
      provide: RabbitMqClient,
      useFactory: (config: NotificationServiceConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
