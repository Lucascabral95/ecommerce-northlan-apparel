import { Module } from '@nestjs/common';
import { OrderGatewayService } from './order.gateway-service';
import { OrdersController } from './orders.controller';

@Module({
  controllers: [OrdersController],
  exports: [OrderGatewayService],
  providers: [OrderGatewayService],
})
export class OrdersModule {}
