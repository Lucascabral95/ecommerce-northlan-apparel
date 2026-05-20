import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { assertRabbitMqTopology, getRabbitMqTopology, loadServiceConfig } from '@northlane/shared';

const config = loadServiceConfig('base-service', 3001);
const BASE_DOMAIN = 'base';

@Injectable()
export class RabbitMqTopologyService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMqTopologyService.name);

  async onModuleInit(): Promise<void> {
    await assertRabbitMqTopology(config.rabbitmqUrl, BASE_DOMAIN);
    const topology = getRabbitMqTopology(BASE_DOMAIN);

    this.logger.log(
      `RabbitMQ topology ready: ${topology.commandExchange}, ${topology.eventExchange}`,
    );
  }
}
