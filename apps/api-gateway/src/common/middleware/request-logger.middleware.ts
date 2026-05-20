import { Injectable, NestMiddleware } from '@nestjs/common';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import { NextFunction, Response } from 'express';
import { ApiGatewayConfigService } from '../../config/api-gateway-config.service';

type HttpRequestLog = {
  correlationId: string;
  durationMs: number;
  ip?: string;
  level: 'info';
  method: string;
  message: string;
  path: string;
  service: string;
  statusCode: number;
  timestamp: string;
  userAgent?: string;
};

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly config: ApiGatewayConfigService) {}

  use(request: CorrelatedRequest, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const log: HttpRequestLog = {
        correlationId: getCorrelationId(request),
        durationMs: Math.round(durationMs * 100) / 100,
        ip: request.ip,
        level: 'info',
        method: request.method,
        message: 'HTTP request completed',
        path: request.originalUrl,
        service: this.config.serviceName,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString(),
        userAgent: request.header('user-agent'),
      };

      process.stdout.write(`${JSON.stringify(log)}\n`);
    });

    next();
  }
}
