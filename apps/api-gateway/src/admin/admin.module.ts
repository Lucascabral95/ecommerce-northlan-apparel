import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [ProductsModule],
  controllers: [AdminController],
})
export class AdminModule {}
