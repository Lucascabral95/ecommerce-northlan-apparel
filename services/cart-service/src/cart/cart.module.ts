import { Module } from '@nestjs/common';
import { CartMessageHandlerService } from './cart-message-handler.service';
import { CartService } from './cart.service';
import { CatalogClientService } from './catalog-client.service';

@Module({
  providers: [CartMessageHandlerService, CartService, CatalogClientService],
})
export class CartModule {}
