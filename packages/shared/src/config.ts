export type ServiceConfig = {
  readonly databaseUrl?: string;
  readonly logLevel: string;
  readonly nodeEnv: string;
  readonly port: number;
  readonly rabbitmqUrl: string;
  readonly redisUrl: string;
  readonly serviceName: string;
};

const DEFAULT_RABBITMQ_URL = 'amqp://northlane:northlane@localhost:5672';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';

export function loadServiceConfig(serviceName: string, defaultPort: number): ServiceConfig {
  return {
    databaseUrl: process.env.DATABASE_URL,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parsePort(process.env.PORT, defaultPort),
    rabbitmqUrl: process.env.RABBITMQ_URL ?? DEFAULT_RABBITMQ_URL,
    redisUrl: process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
    serviceName,
  };
}

function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) {
    return fallback;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return port;
}
