import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export type CorrelatedRequest = Request & {
  correlationId?: string;
};

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: CorrelatedRequest, response: Response, next: NextFunction): void {
    const incomingCorrelationId = request.header(CORRELATION_ID_HEADER);
    const correlationId = incomingCorrelationId && incomingCorrelationId.trim().length > 0
      ? incomingCorrelationId
      : randomUUID();

    request.correlationId = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}

export function getCorrelationId(request: CorrelatedRequest): string {
  return request.correlationId ?? request.header(CORRELATION_ID_HEADER) ?? randomUUID();
}
