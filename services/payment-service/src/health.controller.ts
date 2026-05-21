import { Controller, Get } from '@nestjs/common';
import { PaymentServiceConfigService } from './config/payment-service.config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: PaymentServiceConfigService) {}

  @Get()
  getHealth(): Record<string, string> {
    return {
      service: this.config.serviceName,
      status: 'ok',
    };
  }
}
