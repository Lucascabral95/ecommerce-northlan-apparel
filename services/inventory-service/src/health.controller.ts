import { Controller, Get } from '@nestjs/common';
import { InventoryServiceConfigService } from './config/inventory-service.config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: InventoryServiceConfigService) {}

  @Get()
  getHealth(): Record<string, string> {
    return {
      service: this.config.serviceName,
      status: 'ok',
    };
  }
}
