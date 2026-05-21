import { Module } from '@nestjs/common';
import { PaymentMessageHandlerService } from './payment-message-handler.service';
import { PaymentService } from './payment.service';

@Module({
  providers: [PaymentMessageHandlerService, PaymentService],
})
export class PaymentModule {}
