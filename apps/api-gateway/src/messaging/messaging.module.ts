import { Global, Module } from '@nestjs/common';
import { RabbitMqClient } from '@northlane/shared';
import { ApiGatewayConfigService } from '../config/api-gateway-config.service';

@Global()
@Module({
  exports: [RabbitMqClient],
  providers: [
    {
      inject: [ApiGatewayConfigService],
      provide: RabbitMqClient,
      useFactory: (config: ApiGatewayConfigService) =>
        new RabbitMqClient({
          serviceName: config.serviceName,
          url: config.rabbitMqUrl,
        }),
    },
  ],
})
export class MessagingModule {}
