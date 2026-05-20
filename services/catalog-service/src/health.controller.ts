import { Controller, Get } from '@nestjs/common';
import { loadServiceConfig } from '@northlane/shared';

const config = loadServiceConfig('catalog-service', 4103);

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): Record<string, string> {
    return {
      service: config.serviceName,
      status: 'ok',
    };
  }
}
