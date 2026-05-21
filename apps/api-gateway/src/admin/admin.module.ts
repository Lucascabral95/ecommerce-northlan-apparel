import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [InventoryModule, ProductsModule],
  controllers: [AdminController],
})
export class AdminModule {}
