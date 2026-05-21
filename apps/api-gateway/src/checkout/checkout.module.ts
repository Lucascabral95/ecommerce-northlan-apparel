import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { CheckoutController } from './checkout.controller';

@Module({
  imports: [OrdersModule],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
