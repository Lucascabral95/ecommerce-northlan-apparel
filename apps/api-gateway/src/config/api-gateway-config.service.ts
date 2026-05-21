import { Injectable } from '@nestjs/common';
import { requireStringEnv } from '@northlane/shared';

const API_GATEWAY_SERVICE_NAME = 'api-gateway';
const DEFAULT_PORT = 4000;
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';
const DEFAULT_RATE_LIMIT_TTL_MS = 60_000;
const DEFAULT_RATE_LIMIT_LIMIT = 100;

type NodeEnv = 'development' | 'production' | 'test';
type LogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'warn';

export type ApiGatewayConfig = Readonly<{
  corsOrigins: boolean | string[];
  logLevel: LogLevel;
  nodeEnv: NodeEnv;
  port: number;
  jwtAccessSecret: string;
  rabbitMqUrl: string;
  rateLimit: Readonly<{
    limit: number;
    ttlMs: number;
  }>;
  serviceName: string;
}>;

@Injectable()
export class ApiGatewayConfigService {
  private readonly config = loadApiGatewayConfig();

  get corsOrigins(): boolean | string[] {
    return this.config.corsOrigins;
  }

  get logLevel(): LogLevel {
    return this.config.logLevel;
  }

  get nodeEnv(): NodeEnv {
    return this.config.nodeEnv;
  }

  get port(): number {
    return this.config.port;
  }

  get jwtAccessSecret(): string {
    return this.config.jwtAccessSecret;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get rateLimit(): ApiGatewayConfig['rateLimit'] {
    return this.config.rateLimit;
  }

  get serviceName(): string {
    return this.config.serviceName;
  }
}

export function loadApiGatewayConfig(env: NodeJS.ProcessEnv = process.env): ApiGatewayConfig {
  return {
    corsOrigins: parseCorsOrigins(env.API_CORS_ORIGIN),
    logLevel: parseLogLevel(env.LOG_LEVEL),
    nodeEnv: parseNodeEnv(env.NODE_ENV),
    port: parsePort(env.API_GATEWAY_PORT ?? env.PORT, DEFAULT_PORT),
    jwtAccessSecret: requireStringEnv('JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET),
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    rateLimit: {
      limit: parsePositiveInteger(env.API_RATE_LIMIT_LIMIT, DEFAULT_RATE_LIMIT_LIMIT, 'API_RATE_LIMIT_LIMIT'),
      ttlMs: parsePositiveInteger(env.API_RATE_LIMIT_TTL_MS, DEFAULT_RATE_LIMIT_TTL_MS, 'API_RATE_LIMIT_TTL_MS'),
    },
    serviceName: API_GATEWAY_SERVICE_NAME,
  };
}

function parseCorsOrigins(rawOrigin: string | undefined): boolean | string[] {
  const origin = rawOrigin?.trim() ?? DEFAULT_CORS_ORIGIN;
  if (origin === '*') {
    return true;
  }

  const origins = origin
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (origins.length === 0) {
    throw new Error('API_CORS_ORIGIN must contain at least one origin or "*".');
  }

  return origins;
}

function parseLogLevel(rawLevel: string | undefined): LogLevel {
  const level = rawLevel ?? 'info';
  if (['debug', 'error', 'fatal', 'info', 'warn'].includes(level)) {
    return level as LogLevel;
  }

  throw new Error(`Invalid LOG_LEVEL value: ${level}`);
}

function parseNodeEnv(rawNodeEnv: string | undefined): NodeEnv {
  const nodeEnv = rawNodeEnv ?? 'development';
  if (['development', 'production', 'test'].includes(nodeEnv)) {
    return nodeEnv as NodeEnv;
  }

  throw new Error(`Invalid NODE_ENV value: ${nodeEnv}`);
}

function parsePort(rawPort: string | undefined, fallback: number): number {
  return parsePositiveInteger(rawPort, fallback, 'API_GATEWAY_PORT');
}

function parsePositiveInteger(rawValue: string | undefined, fallback: number, envName: string): number {
  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  if (envName === 'API_GATEWAY_PORT' && value > 65_535) {
    throw new Error('API_GATEWAY_PORT must be lower than or equal to 65535.');
  }

  return value;
}
