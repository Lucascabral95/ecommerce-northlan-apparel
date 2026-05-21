import { Injectable } from '@nestjs/common';
import { parseIntegerEnv, requireStringEnv } from '@northlane/shared';

export type AuthServiceConfig = Readonly<{
  bcryptSaltRounds: number;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtExpiresInSeconds: number;
  port: number;
  rabbitMqUrl: string;
  refreshTokenExpiresInDays: number;
  serviceName: 'auth-service';
}>;

@Injectable()
export class AuthServiceConfigService {
  private readonly config = loadAuthServiceConfig();

  get bcryptSaltRounds(): number {
    return this.config.bcryptSaltRounds;
  }

  get jwtAccessSecret(): string {
    return this.config.jwtAccessSecret;
  }

  get jwtExpiresInSeconds(): number {
    return this.config.jwtExpiresInSeconds;
  }

  get port(): number {
    return this.config.port;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get refreshTokenExpiresInDays(): number {
    return this.config.refreshTokenExpiresInDays;
  }

  get serviceName(): 'auth-service' {
    return this.config.serviceName;
  }
}

export function loadAuthServiceConfig(env: NodeJS.ProcessEnv = process.env): AuthServiceConfig {
  return {
    bcryptSaltRounds: parseIntegerEnv('BCRYPT_SALT_ROUNDS', env.BCRYPT_SALT_ROUNDS, { fallback: 12, min: 8, max: 14 }),
    databaseUrl: requireStringEnv('AUTH_DATABASE_URL', env.AUTH_DATABASE_URL),
    jwtAccessSecret: requireStringEnv('JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET),
    jwtExpiresInSeconds: parseIntegerEnv('JWT_ACCESS_EXPIRES_IN_SECONDS', env.JWT_ACCESS_EXPIRES_IN_SECONDS, {
      fallback: 900,
      min: 60,
    }),
    port: parseIntegerEnv('AUTH_SERVICE_PORT', env.AUTH_SERVICE_PORT ?? env.PORT, { fallback: 4101, min: 1, max: 65_535 }),
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    refreshTokenExpiresInDays: parseIntegerEnv(
      'JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS',
      env.JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS,
      { fallback: 30, min: 1 },
    ),
    serviceName: 'auth-service',
  };
}
