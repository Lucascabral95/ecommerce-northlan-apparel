import { Module } from '@nestjs/common';
import { InventoryMessageHandlerService } from './inventory-message-handler.service';
import { InventoryService } from './inventory.service';

@Module({
  providers: [InventoryMessageHandlerService, InventoryService],
})
export class InventoryModule {}
