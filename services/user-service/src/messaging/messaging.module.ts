import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { UserServiceConfigService } from '../config/user-service.config';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [UserServiceConfigService],
      provide: RabbitMqClient,
      useFactory: (config: UserServiceConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
