import { Module } from '@nestjs/common';
import { CartClientService } from './cart-client.service';
import { OrderMessageHandlerService } from './order-message-handler.service';
import { OrderService } from './order.service';

@Module({
  providers: [CartClientService, OrderMessageHandlerService, OrderService],
})
export class OrderModule {}
