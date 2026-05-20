import { Controller, Get } from '@nestjs/common';
import { loadServiceConfig } from '@northlane/shared';

const config = loadServiceConfig('api-gateway', 4000);

@Controller('status')
export class StatusController {
  @Get()
  getStatus(): Record<string, string> {
    return {
      message: 'Northlane API Gateway is running.',
      nodeEnv: config.nodeEnv,
      service: config.serviceName,
    };
  }
}
