import { Controller, Get } from '@nestjs/common';
import { loadServiceConfig } from '@northlane/shared';

const config = loadServiceConfig('api-gateway', 4000);

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): Record<string, string> {
    return {
      service: config.serviceName,
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
