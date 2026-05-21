import { Injectable } from '@nestjs/common';
import { parseIntegerEnv, requireStringEnv } from '@northlane/shared';

export type CatalogServiceConfig = Readonly<{
  databaseUrl: string;
  port: number;
  rabbitMqUrl: string;
  serviceName: 'catalog-service';
}>;

@Injectable()
export class CatalogServiceConfigService {
  private readonly config = loadCatalogServiceConfig();

  get port(): number {
    return this.config.port;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get serviceName(): 'catalog-service' {
    return this.config.serviceName;
  }
}

export function loadCatalogServiceConfig(env: NodeJS.ProcessEnv = process.env): CatalogServiceConfig {
  return {
    databaseUrl: requireStringEnv('CATALOG_DATABASE_URL', env.CATALOG_DATABASE_URL),
    port: parseIntegerEnv('CATALOG_SERVICE_PORT', env.CATALOG_SERVICE_PORT ?? env.PORT, {
      fallback: 4103,
      max: 65_535,
      min: 1,
    }),
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    serviceName: 'catalog-service',
  };
}
