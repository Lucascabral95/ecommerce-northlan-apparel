import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [InventoryModule, OrdersModule, ProductsModule],
  controllers: [AdminController],
})
export class AdminModule {}
