import { Controller, Get, Header } from '@nestjs/common';
import { createMetricsRegistry } from '@northlane/shared';

const registry = createMetricsRegistry('api-gateway');

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', registry.contentType)
  async getMetrics(): Promise<string> {
    return registry.metrics();
  }
}
