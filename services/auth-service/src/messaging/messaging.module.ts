import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { AuthServiceConfigService } from '../config/auth-service.config';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [AuthServiceConfigService],
      provide: RabbitMqClient,
      useFactory: (config: AuthServiceConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
