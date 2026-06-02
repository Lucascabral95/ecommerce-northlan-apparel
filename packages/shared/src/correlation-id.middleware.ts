import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

export type CorrelatedRequest = Request & {
  correlationId?: string;
  requestId?: string;
};

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: CorrelatedRequest, response: Response, next: NextFunction): void {
    const correlationId = ensureCorrelationId(request.header(CORRELATION_ID_HEADER));
    const requestId = ensureCorrelationId(request.header(REQUEST_ID_HEADER));

    request.correlationId = correlationId;
    request.requestId = requestId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    response.setHeader(REQUEST_ID_HEADER, requestId);
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

export function getRequestId(request: CorrelatedRequest): string {
  return ensureCorrelationId(request.requestId ?? request.header(REQUEST_ID_HEADER));
}
