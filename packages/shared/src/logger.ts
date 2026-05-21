import type { LoggerService } from '@nestjs/common';

export type LogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'warn';

export type LogPayload = {
  correlationId?: string;
  context?: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  service: string;
  timestamp: string;
  trace?: string;
};

export type LoggerContext = Readonly<{
  correlationId?: string;
  context?: string;
  metadata?: Record<string, unknown>;
}>;

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
    this.emit(level, message, loggerContext.context, undefined, {
      correlationId: loggerContext.correlationId,
      metadata: loggerContext.metadata,
    });
  }

  private write(level: LogLevel, message: string, context?: string, trace?: string): void {
    this.emit(level, message, context, trace, {});
  }

  private emit(
    level: LogLevel,
    message: string,
    context: string | undefined,
    trace: string | undefined,
    extra: Pick<LogPayload, 'correlationId' | 'metadata'>,
  ): void {
    const payload: LogPayload = {
      correlationId: extra.correlationId,
      context,
      level,
      message,
      metadata: extra.metadata,
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      trace,
    };

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

function removeUndefinedValues(payload: LogPayload): void {
  const mutablePayload = payload as Record<string, unknown>;
  for (const key of Object.keys(mutablePayload)) {
    if (mutablePayload[key] === undefined) {
      delete mutablePayload[key];
    }
  }
}
