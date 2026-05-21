import { Injectable } from '@nestjs/common';
import { parseIntegerEnv, requireStringEnv } from '@northlane/shared';

export type OrderServiceConfig = Readonly<{
  databaseUrl: string;
  port: number;
  rabbitMqUrl: string;
  serviceName: 'order-service';
}>;

@Injectable()
export class OrderServiceConfigService {
  private readonly config = loadOrderServiceConfig();

  get port(): number {
    return this.config.port;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get serviceName(): 'order-service' {
    return this.config.serviceName;
  }
}

export function loadOrderServiceConfig(env: NodeJS.ProcessEnv = process.env): OrderServiceConfig {
  return {
    databaseUrl: requireStringEnv('ORDER_DATABASE_URL', env.ORDER_DATABASE_URL),
    port: parseIntegerEnv('ORDER_SERVICE_PORT', env.ORDER_SERVICE_PORT ?? env.PORT, {
      fallback: 4106,
      max: 65_535,
      min: 1,
    }),
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    serviceName: 'order-service',
  };
}
