import { Controller, Get } from '@nestjs/common';
import { createPlaceholderResponse, PlaceholderResponse } from '../common/responses/placeholder-response';

@Controller('auth')
export class AuthController {
  @Get()
  getPlaceholder(): PlaceholderResponse {
    return createPlaceholderResponse('auth');
  }
}
