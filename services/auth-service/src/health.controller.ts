import { Controller, Get } from '@nestjs/common';
import { loadServiceConfig } from '@northlane/shared';

const config = loadServiceConfig('auth-service', 4101);

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
