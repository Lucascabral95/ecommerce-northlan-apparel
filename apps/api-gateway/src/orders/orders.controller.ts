import { Controller, Get } from '@nestjs/common';
import { createPlaceholderResponse, PlaceholderResponse } from '../common/responses/placeholder-response';

@Controller('orders')
export class OrdersController {
  @Get()
  getPlaceholder(): PlaceholderResponse {
    return createPlaceholderResponse('orders');
  }
}
