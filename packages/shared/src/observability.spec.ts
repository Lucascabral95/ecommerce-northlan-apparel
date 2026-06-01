import { describe, expect, it, vi } from 'vitest';
import { JsonLogger } from './logger';
import {
  recordCheckoutCompleted,
  recordPaymentSucceeded,
  recordRabbitMqConsumed,
  recordHttpRequest,
  renderPrometheusMetrics,
} from './metrics';
import { ObservabilityService } from './observability.module';

describe('observability', () => {
  it('returns standard health payloads', () => {
    const service = new ObservabilityService({ serviceName: 'test-service' });

    expect(service.getHealth()).toMatchObject({
      service: 'test-service',
      status: 'ok',
    });
    expect(service.getHealth().timestamp).toEqual(expect.any(String));
    expect(service.getHealth().uptime).toEqual(expect.any(Number));
  });

  it('renders Prometheus metrics after HTTP observations', async () => {
    recordHttpRequest({
      durationSeconds: 0.12,
      method: 'GET',
      route: '/health',
      service: 'test-service',
      statusCode: 200,
    });

    const metrics = await renderPrometheusMetrics();

    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('http_request_duration_seconds_bucket');
    expect(metrics).toContain('service="test-service"');
  });

  it('renders business and RabbitMQ metrics', async () => {
    recordCheckoutCompleted('order-service');
    recordPaymentSucceeded({
      provider: 'MOCK',
      service: 'payment-service',
      status: 'APPROVED',
    });
    recordRabbitMqConsumed({
      exchange: 'order.exchange',
      messageType: 'order.event.order_confirmed',
      queue: 'order.events.queue',
      routingKey: 'order.event.order_confirmed',
      service: 'notification-service',
    });

    const metrics = await renderPrometheusMetrics();

    expect(metrics).toContain('checkout_completed_total');
    expect(metrics).toContain('payments_succeeded_total');
    expect(metrics).toContain('rabbitmq_messages_consumed_total');
  });

  it('writes structured JSON logs with correlationId', () => {
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = new JsonLogger('test-service');

    logger.writeWithContext('info', 'request completed', {
      correlationId: 'correlation-123',
      method: 'GET',
      requestId: 'request-123',
      route: '/health',
      statusCode: 200,
    });

    const line = stdoutWrite.mock.calls[0]?.[0]?.toString() ?? '';
    const parsed = JSON.parse(line);

    expect(parsed).toMatchObject({
      correlationId: 'correlation-123',
      level: 'info',
      method: 'GET',
      requestId: 'request-123',
      route: '/health',
      service: 'test-service',
      statusCode: 200,
    });

    stdoutWrite.mockRestore();
  });
});
