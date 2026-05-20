import { Controller, Get } from '@nestjs/common';
import { createPlaceholderResponse, PlaceholderResponse } from '../common/responses/placeholder-response';

@Controller('checkout')
export class CheckoutController {
  @Get()
  getPlaceholder(): PlaceholderResponse {
    return createPlaceholderResponse('checkout');
  }
}
