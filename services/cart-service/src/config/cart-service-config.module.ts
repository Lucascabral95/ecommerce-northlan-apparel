import { Global, Module } from '@nestjs/common';
import { CartServiceConfigService } from './cart-service.config';

@Global()
@Module({
  exports: [CartServiceConfigService],
  providers: [CartServiceConfigService],
})
export class CartServiceConfigModule {}
