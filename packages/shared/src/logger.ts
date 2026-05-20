import type { LoggerService } from '@nestjs/common';

type LogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'warn';

type LogPayload = {
  context?: string;
  level: LogLevel;
  message: string;
  service: string;
  timestamp: string;
  trace?: string;
};

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

  private write(level: LogLevel, message: string, context?: string, trace?: string): void {
    const payload: LogPayload = {
      context,
      level,
      message,
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      trace,
    };

    const line = JSON.stringify(payload);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(`${line}\n`);
      return;
    }

    process.stdout.write(`${line}\n`);
  }
}
