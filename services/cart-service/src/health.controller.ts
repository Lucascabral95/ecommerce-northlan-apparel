import { Controller, Get } from '@nestjs/common';
import { CartServiceConfigService } from './config/cart-service.config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: CartServiceConfigService) {}

  @Get()
  getHealth(): Record<string, string> {
    return {
      service: this.config.serviceName,
      status: 'ok',
    };
  }
}
