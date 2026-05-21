import { Module } from '@nestjs/common';
import { InventoryGatewayService } from './inventory.gateway-service';

@Module({
  exports: [InventoryGatewayService],
  providers: [InventoryGatewayService],
})
export class InventoryModule {}
