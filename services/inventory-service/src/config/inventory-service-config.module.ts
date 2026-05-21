import { Global, Module } from '@nestjs/common';
import { InventoryServiceConfigService } from './inventory-service.config';

@Global()
@Module({
  exports: [InventoryServiceConfigService],
  providers: [InventoryServiceConfigService],
})
export class InventoryServiceConfigModule {}
