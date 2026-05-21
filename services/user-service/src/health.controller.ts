import { Controller, Get } from '@nestjs/common';
import { UserServiceConfigService } from './config/user-service.config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: UserServiceConfigService) {}

  @Get()
  getHealth(): Record<string, string> {
    return {
      service: this.config.serviceName,
      status: 'ok',
    };
  }
}
