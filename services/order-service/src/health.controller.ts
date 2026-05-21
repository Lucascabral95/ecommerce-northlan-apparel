import { Controller, Get } from '@nestjs/common';
import { OrderServiceConfigService } from './config/order-service.config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: OrderServiceConfigService) {}

  @Get()
  getHealth(): Record<string, string> {
    return {
      service: this.config.serviceName,
      status: 'ok',
    };
  }
}
