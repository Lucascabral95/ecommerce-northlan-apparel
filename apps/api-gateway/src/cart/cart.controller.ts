import { Controller, Get } from '@nestjs/common';
import { createPlaceholderResponse, PlaceholderResponse } from '../common/responses/placeholder-response';

@Controller('cart')
export class CartController {
  @Get()
  getPlaceholder(): PlaceholderResponse {
    return createPlaceholderResponse('cart');
  }
}
