import { Global, Module } from '@nestjs/common';
import { PaymentServiceConfigService } from './payment-service.config';

@Global()
@Module({
  exports: [PaymentServiceConfigService],
  providers: [PaymentServiceConfigService],
})
export class PaymentServiceConfigModule {}
