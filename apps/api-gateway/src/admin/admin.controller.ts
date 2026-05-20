import { Controller, Get } from '@nestjs/common';
import { createPlaceholderResponse, PlaceholderResponse } from '../common/responses/placeholder-response';

@Controller('admin')
export class AdminController {
  @Get()
  getPlaceholder(): PlaceholderResponse {
    return createPlaceholderResponse('admin');
  }
}
