import type { LoggerService } from '@nestjs/common';

export type LogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'warn';

export type LogPayload = {
  correlationId?: string;
  context?: string;
  durationMs?: number;
  error?: unknown;
  eventType?: string;
  exchange?: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  method?: string;
  orderId?: string;
  paymentId?: string;
  queue?: string;
  requestId?: string;
  route?: string;
  routingKey?: string;
  service: string;
  statusCode?: number;
  timestamp: string;
  trace?: string;
  userId?: string;
};

type LoggerExtra = Partial<
  Pick<
    LogPayload,
    | 'correlationId'
    | 'durationMs'
    | 'error'
    | 'eventType'
    | 'exchange'
    | 'metadata'
    | 'method'
    | 'orderId'
    | 'paymentId'
    | 'queue'
    | 'requestId'
    | 'route'
    | 'routingKey'
    | 'statusCode'
    | 'userId'
  >
>;

export type LoggerContext = Readonly<LoggerExtra & Pick<LogPayload, 'context'>>;

export class JsonLogger implements LoggerService {
  constructor(private readonly serviceName: string) {}

  log(message: string, context?: string): void {
    this.write('info', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: string, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.write('debug', message, context);
  }

  fatal(message: string, context?: string): void {
    this.write('fatal', message, context);
  }

  writeWithContext(level: LogLevel, message: string, loggerContext: LoggerContext = {}): void {
    this.emit(level, message, loggerContext.context, undefined, loggerContext);
  }

  private write(level: LogLevel, message: string, context?: string, trace?: string): void {
    this.emit(level, message, context, trace, {});
  }

  private emit(
    level: LogLevel,
    message: string,
    context: string | undefined,
    trace: string | undefined,
    extra: LoggerExtra,
  ): void {
    const payload: LogPayload = {
      correlationId: extra.correlationId,
      context,
      durationMs: extra.durationMs,
      error: serializeError(extra.error),
      eventType: extra.eventType,
      exchange: extra.exchange,
      level,
      message,
      method: extra.method,
      orderId: extra.orderId,
      paymentId: extra.paymentId,
      queue: extra.queue,
      requestId: extra.requestId,
      route: extra.route,
      routingKey: extra.routingKey,
      service: this.serviceName,
      statusCode: extra.statusCode,
      timestamp: new Date().toISOString(),
      trace: shouldIncludeTrace() ? trace : undefined,
      userId: extra.userId,
    };

    applyMetadata(payload, sanitizeMetadata(extra.metadata));
    removeUndefinedValues(payload);

    const line = JSON.stringify(payload);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(`${line}\n`);
      return;
    }

    process.stdout.write(`${line}\n`);
  }
}

export function createLogger(serviceName: string): JsonLogger {
  return new JsonLogger(serviceName);
}

function applyMetadata(payload: LogPayload, metadata: Record<string, unknown> | undefined): void {
  if (!metadata) {
    return;
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }

    if (key in payload) {
      (payload as Record<string, unknown>)[key] = value;
      continue;
    }

    payload.metadata = {
      ...(payload.metadata ?? {}),
      [key]: value,
    };
  }
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isSensitiveLogKey(key)) {
      sanitized[key] = '[redacted]';
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

function serializeError(error: unknown): unknown {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: shouldIncludeTrace() ? error.stack : undefined,
    };
  }

  if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') {
    return error;
  }

  return String(error);
}

function isSensitiveLogKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return (
    normalizedKey.includes('password') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('secret') ||
    normalizedKey.includes('authorization')
  );
}

function shouldIncludeTrace(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function removeUndefinedValues(payload: LogPayload): void {
  const mutablePayload = payload as Record<string, unknown>;
  for (const key of Object.keys(mutablePayload)) {
    if (mutablePayload[key] === undefined) {
      delete mutablePayload[key];
    }
  }
}
