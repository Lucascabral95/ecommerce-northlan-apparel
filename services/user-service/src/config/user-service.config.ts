import { Injectable } from '@nestjs/common';
import { parseIntegerEnv, requireStringEnv } from '@northlane/shared';

export type UserServiceConfig = Readonly<{
  databaseUrl: string;
  port: number;
  rabbitMqUrl: string;
  serviceName: 'user-service';
}>;

@Injectable()
export class UserServiceConfigService {
  private readonly config = loadUserServiceConfig();

  get port(): number {
    return this.config.port;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get serviceName(): 'user-service' {
    return this.config.serviceName;
  }
}

export function loadUserServiceConfig(env: NodeJS.ProcessEnv = process.env): UserServiceConfig {
  return {
    databaseUrl: requireStringEnv('USER_DATABASE_URL', env.USER_DATABASE_URL),
    port: parseIntegerEnv('USER_SERVICE_PORT', env.USER_SERVICE_PORT ?? env.PORT, { fallback: 4102, min: 1, max: 65_535 }),
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    serviceName: 'user-service',
  };
}
