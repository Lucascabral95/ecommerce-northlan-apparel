import {
  Controller,
  DynamicModule,
  ExecutionContext,
  Get,
  Injectable,
  Module,
  Res,
  type CallHandler,
  type NestInterceptor,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { Response } from 'express';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import {
  getCorrelationId,
  getRequestId,
  type CorrelatedRequest,
} from './correlation-id.middleware';
import { JsonLogger } from './logger';
import {
  getPrometheusContentType,
  recordHttpRequest,
  renderPrometheusMetrics,
} from './metrics';

export const OBSERVABILITY_OPTIONS = Symbol('OBSERVABILITY_OPTIONS');

export type ObservabilityOptions = Readonly<{
  serviceName: string;
}>;

type HealthResponse = Readonly<{
  service: string;
  status: 'ok';
  timestamp: string;
  uptime: number;
}>;

type ExpressRequestWithRoute = CorrelatedRequest & {
  route?: {
    path?: string;
  };
};

@Injectable()
export class ObservabilityService {
  private readonly logger: JsonLogger;

  constructor(private readonly options: ObservabilityOptions) {
    this.logger = new JsonLogger(options.serviceName);
  }

  get serviceName(): string {
    return this.options.serviceName;
  }

  getHealth(): HealthResponse {
    return {
      service: this.options.serviceName,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }

  async getMetrics(): Promise<string> {
    return renderPrometheusMetrics();
  }

  getMetricsContentType(): string {
    return getPrometheusContentType();
  }

  logHttpRequest(input: {
    correlationId: string;
    durationMs: number;
    method: string;
    requestId: string;
    route: string;
    statusCode: number;
  }): void {
    this.logger.writeWithContext(input.statusCode >= 500 ? 'error' : 'info', 'HTTP request completed', {
      context: 'HttpMetricsInterceptor',
      correlationId: input.correlationId,
      metadata: {
        durationMs: input.durationMs,
        method: input.method,
        requestId: input.requestId,
        route: input.route,
        statusCode: input.statusCode,
      },
    });
  }
}

@Controller()
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.observabilityService.getHealth();
  }

  @Get('metrics')
  async getMetrics(@Res({ passthrough: true }) response: Response): Promise<string> {
    response.type(this.observabilityService.getMetricsContentType());
    return this.observabilityService.getMetrics();
  }
}

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly observabilityService: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<ExpressRequestWithRoute>();
    const response = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    let capturedErrorStatus: number | undefined;

    return next.handle().pipe(
      catchError((error: unknown) => {
        capturedErrorStatus = resolveErrorStatus(error);
        return throwError(() => error);
      }),
      finalize(() => {
        const route = resolveRoute(request);
        if (route === '/metrics') {
          return;
        }

        const statusCode = capturedErrorStatus ?? response.statusCode;
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        recordHttpRequest({
          durationSeconds: durationMs / 1_000,
          method: request.method,
          route,
          service: this.observabilityService.serviceName,
          statusCode,
        });

        this.observabilityService.logHttpRequest({
          correlationId: getCorrelationId(request),
          durationMs: Math.round(durationMs * 100) / 100,
          method: request.method,
          requestId: getRequestId(request),
          route,
          statusCode,
        });
      }),
    );
  }
}

@Module({})
export class ObservabilityModule {
  static register(options: ObservabilityOptions): DynamicModule {
    return {
      controllers: [ObservabilityController],
      module: ObservabilityModule,
      providers: [
        {
          provide: OBSERVABILITY_OPTIONS,
          useValue: options,
        },
        {
          inject: [OBSERVABILITY_OPTIONS],
          provide: ObservabilityService,
          useFactory: (moduleOptions: ObservabilityOptions) =>
            new ObservabilityService(moduleOptions),
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: HttpMetricsInterceptor,
        },
      ],
    };
  }
}

function resolveRoute(request: ExpressRequestWithRoute): string {
  const routePath = request.route?.path;
  if (typeof routePath === 'string' && routePath.length > 0) {
    const baseUrl = request.baseUrl === '/' ? '' : request.baseUrl;
    return `${baseUrl}${routePath}` || routePath;
  }

  return request.path || request.originalUrl || 'unknown';
}

function resolveErrorStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'getStatus' in error &&
    typeof (error as { getStatus?: unknown }).getStatus === 'function'
  ) {
    return (error as { getStatus: () => number }).getStatus();
  }

  return undefined;
}
