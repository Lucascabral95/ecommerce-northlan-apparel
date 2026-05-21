import { Module } from '@nestjs/common';
import { CatalogGatewayService } from './catalog.gateway-service';
import { CategoriesController } from './categories.controller';
import { ProductsController } from './products.controller';

@Module({
  controllers: [CategoriesController, ProductsController],
  providers: [CatalogGatewayService],
  exports: [CatalogGatewayService],
})
export class ProductsModule {}
