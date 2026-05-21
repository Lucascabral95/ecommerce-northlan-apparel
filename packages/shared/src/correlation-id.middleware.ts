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
    const correlationId = ensureCorrelationId(request.header(CORRELATION_ID_HEADER));

    request.correlationId = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}

export function createCorrelationId(): string {
  return randomUUID();
}

export function ensureCorrelationId(candidate: string | undefined): string {
  const normalizedCandidate = candidate?.trim();
  return normalizedCandidate && normalizedCandidate.length > 0 ? normalizedCandidate : createCorrelationId();
}

export function getCorrelationId(request: CorrelatedRequest): string {
  return ensureCorrelationId(request.correlationId ?? request.header(CORRELATION_ID_HEADER));
}
