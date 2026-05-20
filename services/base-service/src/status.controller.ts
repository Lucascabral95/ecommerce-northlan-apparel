import { Controller, Get } from '@nestjs/common';
import { getRabbitMqTopology, loadServiceConfig } from '@northlane/shared';

const config = loadServiceConfig('base-service', 3001);
const topology = getRabbitMqTopology('base');

@Controller('status')
export class StatusController {
  @Get()
  getStatus(): Record<string, string> {
    return {
      commandExchange: topology.commandExchange,
      eventExchange: topology.eventExchange,
      message: 'Northlane base service is running.',
      nodeEnv: config.nodeEnv,
      service: config.serviceName,
    };
  }
}
