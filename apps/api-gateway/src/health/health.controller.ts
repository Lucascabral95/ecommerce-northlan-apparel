import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiGatewayConfigService } from '../config/api-gateway-config.service';

type HealthResponse = Readonly<{
  environment: string;
  service: string;
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}>;

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly config: ApiGatewayConfigService) {}

  @Get()
  getHealth(): HealthResponse {
    return {
      environment: this.config.nodeEnv,
      service: this.config.serviceName,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
