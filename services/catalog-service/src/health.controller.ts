import { Controller, Get } from '@nestjs/common';
import { CatalogServiceConfigService } from './config/catalog-service.config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: CatalogServiceConfigService) {}

  @Get()
  getHealth(): Record<string, string> {
    return {
      service: this.config.serviceName,
      status: 'ok',
    };
  }
}
