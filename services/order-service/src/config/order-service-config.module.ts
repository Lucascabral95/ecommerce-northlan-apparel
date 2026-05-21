import { Global, Module } from '@nestjs/common';
import { OrderServiceConfigService } from './order-service.config';

@Global()
@Module({
  exports: [OrderServiceConfigService],
  providers: [OrderServiceConfigService],
})
export class OrderServiceConfigModule {}
