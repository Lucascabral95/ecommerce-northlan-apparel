import { Injectable } from '@nestjs/common';
import { parseIntegerEnv, requireStringEnv } from '@northlane/shared';

export type InventoryServiceConfig = Readonly<{
  databaseUrl: string;
  defaultReservationTtlSeconds: number;
  port: number;
  rabbitMqUrl: string;
  serviceName: 'inventory-service';
}>;

@Injectable()
export class InventoryServiceConfigService {
  private readonly config = loadInventoryServiceConfig();

  get defaultReservationTtlSeconds(): number {
    return this.config.defaultReservationTtlSeconds;
  }

  get port(): number {
    return this.config.port;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get serviceName(): 'inventory-service' {
    return this.config.serviceName;
  }
}

export function loadInventoryServiceConfig(env: NodeJS.ProcessEnv = process.env): InventoryServiceConfig {
  return {
    databaseUrl: requireStringEnv('INVENTORY_DATABASE_URL', env.INVENTORY_DATABASE_URL),
    defaultReservationTtlSeconds: parseIntegerEnv(
      'INVENTORY_RESERVATION_TTL_SECONDS',
      env.INVENTORY_RESERVATION_TTL_SECONDS,
      {
        fallback: 900,
        min: 60,
      },
    ),
    port: parseIntegerEnv('INVENTORY_SERVICE_PORT', env.INVENTORY_SERVICE_PORT ?? env.PORT, {
      fallback: 4104,
      max: 65_535,
      min: 1,
    }),
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    serviceName: 'inventory-service',
  };
}
