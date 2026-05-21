import { Injectable } from '@nestjs/common';
import { parseIntegerEnv, requireStringEnv } from '@northlane/shared';

export type NotificationServiceConfig = Readonly<{
  databaseUrl: string;
  port: number;
  rabbitMqUrl: string;
  serviceName: 'notification-service';
}>;

@Injectable()
export class NotificationServiceConfigService {
  private readonly config = loadNotificationServiceConfig();

  get port(): number {
    return this.config.port;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get serviceName(): 'notification-service' {
    return this.config.serviceName;
  }
}

export function loadNotificationServiceConfig(
  env: NodeJS.ProcessEnv = process.env,
): NotificationServiceConfig {
  return {
    databaseUrl: requireStringEnv('NOTIFICATION_DATABASE_URL', env.NOTIFICATION_DATABASE_URL),
    port: parseIntegerEnv('NOTIFICATION_SERVICE_PORT', env.NOTIFICATION_SERVICE_PORT ?? env.PORT, {
      fallback: 4108,
      max: 65_535,
      min: 1,
    }),
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    serviceName: 'notification-service',
  };
}
