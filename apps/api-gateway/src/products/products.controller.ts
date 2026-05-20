import { Controller, Get } from '@nestjs/common';
import { createPlaceholderResponse, PlaceholderResponse } from '../common/responses/placeholder-response';

@Controller('products')
export class ProductsController {
  @Get()
  getPlaceholder(): PlaceholderResponse {
    return createPlaceholderResponse('products');
  }
}
