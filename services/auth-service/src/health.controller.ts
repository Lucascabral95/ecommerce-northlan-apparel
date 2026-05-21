import { Controller, Get } from '@nestjs/common';
import { AuthServiceConfigService } from './config/auth-service.config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: AuthServiceConfigService) {}

  @Get()
  getHealth(): Record<string, string> {
    return {
      service: this.config.serviceName,
      status: 'ok',
    };
  }
}
