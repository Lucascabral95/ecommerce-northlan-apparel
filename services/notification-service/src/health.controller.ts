import { Controller, Get } from '@nestjs/common';
import { loadServiceConfig } from '@northlane/shared';

const config = loadServiceConfig('notification-service', 4108);

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
