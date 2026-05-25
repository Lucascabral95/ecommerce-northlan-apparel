import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsGatewayService } from './payments.gateway-service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsGatewayService],
})
export class PaymentsModule {}
