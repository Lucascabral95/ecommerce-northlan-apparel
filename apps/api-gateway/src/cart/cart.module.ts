import { Module } from '@nestjs/common';
import { CartGatewayService } from './cart.gateway-service';
import { CartController } from './cart.controller';

@Module({
  controllers: [CartController],
  providers: [CartGatewayService],
})
export class CartModule {}
