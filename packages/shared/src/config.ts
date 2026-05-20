export type ServiceConfig = {
  readonly databaseUrl?: string;
  readonly logLevel: string;
  readonly nodeEnv: string;
  readonly port: number;
  readonly serviceName: string;
};

export function loadServiceConfig(serviceName: string, defaultPort: number): ServiceConfig {
  return {
    databaseUrl: process.env.DATABASE_URL,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parsePort(process.env.PORT, defaultPort),
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
