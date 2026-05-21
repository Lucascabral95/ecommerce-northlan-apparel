import { Injectable } from '@nestjs/common';
import { parseIntegerEnv, requireStringEnv } from '@northlane/shared';

export type CartServiceConfig = Readonly<{
  databaseUrl: string;
  port: number;
  rabbitMqUrl: string;
  serviceName: 'cart-service';
}>;

@Injectable()
export class CartServiceConfigService {
  private readonly config = loadCartServiceConfig();

  get port(): number {
    return this.config.port;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get serviceName(): 'cart-service' {
    return this.config.serviceName;
  }
}

export function loadCartServiceConfig(env: NodeJS.ProcessEnv = process.env): CartServiceConfig {
  return {
    databaseUrl: requireStringEnv('CART_DATABASE_URL', env.CART_DATABASE_URL),
    port: parseIntegerEnv('CART_SERVICE_PORT', env.CART_SERVICE_PORT ?? env.PORT, {
      fallback: 4105,
      max: 65_535,
      min: 1,
    }),
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    serviceName: 'cart-service',
  };
}
