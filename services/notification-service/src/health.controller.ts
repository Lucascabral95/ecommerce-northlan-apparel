import { Controller, Get } from '@nestjs/common';
import { NotificationServiceConfigService } from './config/notification-service.config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: NotificationServiceConfigService) {}

  @Get()
  getHealth(): Record<string, string> {
    return {
      service: this.config.serviceName,
      status: 'ok',
    };
  }
}
