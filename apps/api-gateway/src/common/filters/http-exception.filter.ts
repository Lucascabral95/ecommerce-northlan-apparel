import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import { Response } from 'express';

type ErrorResponseBody = {
  correlationId: string;
  error: {
    code: string;
    details?: unknown;
    message: string;
  };
  method: string;
  path: string;
  statusCode: number;
  success: false;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<CorrelatedRequest>();
    const response = context.getResponse<Response>();
    const statusCode = this.resolveStatusCode(exception);
    const exceptionBody = this.resolveExceptionBody(exception);
    const correlationId = getCorrelationId(request);

    const body: ErrorResponseBody = {
      correlationId,
      error: {
        code: this.resolveErrorCode(statusCode, exceptionBody),
        details: this.resolveErrorDetails(exceptionBody),
        message: this.resolveErrorMessage(statusCode, exception, exceptionBody),
      },
      method: request.method,
      path: request.originalUrl,
      statusCode,
      success: false,
      timestamp: new Date().toISOString(),
    };

    if (body.error.details === undefined) {
      delete body.error.details;
    }

    response.status(statusCode).json(body);
  }

  private resolveStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveExceptionBody(exception: unknown): Record<string, unknown> | undefined {
    if (!(exception instanceof HttpException)) {
      return undefined;
    }

    const response = exception.getResponse();
    return isRecord(response) ? response : undefined;
  }

  private resolveErrorCode(statusCode: number, exceptionBody: Record<string, unknown> | undefined): string {
    const explicitCode = exceptionBody?.code;
    if (typeof explicitCode === 'string' && explicitCode.trim().length > 0) {
      return toConstantCase(explicitCode);
    }

    const nestError = exceptionBody?.error;
    if (typeof nestError === 'string' && nestError.trim().length > 0) {
      return toConstantCase(nestError);
    }

    return `HTTP_${statusCode}`;
  }

  private resolveErrorDetails(exceptionBody: Record<string, unknown> | undefined): unknown {
    const details = exceptionBody?.details;
    if (details !== undefined) {
      return details;
    }

    const message = exceptionBody?.message;
    if (Array.isArray(message)) {
      return { issues: message };
    }

    return undefined;
  }

  private resolveErrorMessage(
    statusCode: number,
    exception: unknown,
    exceptionBody: Record<string, unknown> | undefined,
  ): string {
    const message = exceptionBody?.message;
    if (Array.isArray(message)) {
      return 'Validation failed.';
    }

    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    if (exception instanceof Error && statusCode < HttpStatus.INTERNAL_SERVER_ERROR) {
      return exception.message;
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error.';
    }

    return 'Request failed.';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toConstantCase(value: string): string {
  const constant = value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return constant.length > 0 ? constant : 'REQUEST_FAILED';
}
