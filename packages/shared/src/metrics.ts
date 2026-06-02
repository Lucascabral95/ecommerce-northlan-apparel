import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
  type Metric,
} from 'prom-client';

type LabelValue = string | number | undefined;

export type HttpMetricInput = Readonly<{
  durationSeconds: number;
  method: string;
  route: string;
  service: string;
  statusCode: number;
}>;

export type RabbitMqMetricInput = Readonly<{
  exchange?: string;
  messageType?: string;
  queue?: string;
  routingKey?: string;
  service: string;
}>;

export type PaymentMetricInput = Readonly<{
  provider: string;
  service: string;
  status: string;
}>;

const registry = new Registry();
let defaultMetricsCollected = false;

export function getMetricsRegistry(): Registry {
  if (!defaultMetricsCollected) {
    collectDefaultMetrics({
      prefix: 'nodejs_',
      register: registry,
    });
    defaultMetricsCollected = true;
  }

  return registry;
}

export async function renderPrometheusMetrics(): Promise<string> {
  return getMetricsRegistry().metrics();
}

export function getPrometheusContentType(): string {
  return getMetricsRegistry().contentType;
}

export function recordHttpRequest(input: HttpMetricInput): void {
  const labels = {
    method: input.method,
    route: input.route,
    service: input.service,
    status_code: input.statusCode.toString(),
  };

  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, input.durationSeconds);
  if (input.statusCode >= 400) {
    httpRequestsErrorsTotal.inc(labels);
  }
}

export function recordRabbitMqPublished(input: RabbitMqMetricInput): void {
  rabbitMqMessagesPublishedTotal.inc(rabbitLabels(input));
}

export function recordRabbitMqConsumed(input: RabbitMqMetricInput): void {
  rabbitMqMessagesConsumedTotal.inc(rabbitLabels(input));
}

export function recordRabbitMqFailed(input: RabbitMqMetricInput): void {
  rabbitMqMessagesFailedTotal.inc(rabbitLabels(input));
}

export function recordRabbitMqRetried(input: RabbitMqMetricInput): void {
  rabbitMqMessagesRetriedTotal.inc(rabbitLabels(input));
}

export function recordRabbitMqDeadLetter(input: RabbitMqMetricInput): void {
  rabbitMqDeadLetterMessagesTotal.inc(rabbitLabels(input));
}

export function recordCheckoutStarted(service: string): void {
  checkoutStartedTotal.inc({ service });
}

export function recordCheckoutCompleted(service: string): void {
  checkoutCompletedTotal.inc({ service });
}

export function recordCheckoutFailed(service: string): void {
  checkoutFailedTotal.inc({ service });
}

export function recordCheckoutDuration(service: string, durationSeconds: number): void {
  checkoutDurationSeconds.observe({ service }, durationSeconds);
}

export function recordOrderCreated(service: string): void {
  ordersCreatedTotal.inc({ service });
}

export function recordOrderConfirmed(service: string): void {
  ordersConfirmedTotal.inc({ service });
}

export function recordOrderCancelled(service: string): void {
  ordersCancelledTotal.inc({ service });
}

export function recordOrderFailed(service: string): void {
  ordersFailedTotal.inc({ service });
}

export function recordPaymentCreated(input: PaymentMetricInput): void {
  paymentsCreatedTotal.inc(input);
}

export function recordPaymentSucceeded(input: PaymentMetricInput): void {
  paymentsSucceededTotal.inc(input);
}

export function recordPaymentFailed(input: PaymentMetricInput): void {
  paymentsFailedTotal.inc(input);
}

export function recordPaymentPending(input: PaymentMetricInput): void {
  paymentsPendingTotal.inc(input);
}

export function recordStockReservation(service: string): void {
  stockReservationsTotal.inc({ service });
}

export function recordStockReservationFailed(service: string): void {
  stockReservationsFailedTotal.inc({ service });
}

export function recordStockReservationConfirmed(service: string): void {
  stockReservationsConfirmedTotal.inc({ service });
}

export function recordStockReservationReleased(service: string): void {
  stockReservationsReleasedTotal.inc({ service });
}

export function recordStockLowItems(service: string, count = 1): void {
  stockLowItemsTotal.inc({ service }, count);
}

export function recordAuthLoginSuccess(service: string): void {
  authLoginSuccessTotal.inc({ service });
}

export function recordAuthLoginFailed(service: string): void {
  authLoginFailedTotal.inc({ service });
}

export function recordAuthRegisterSuccess(service: string): void {
  authRegisterSuccessTotal.inc({ service });
}

export function recordAuthRegisterFailed(service: string): void {
  authRegisterFailedTotal.inc({ service });
}

function rabbitLabels(input: RabbitMqMetricInput): Record<string, string> {
  return {
    exchange: normalizeLabel(input.exchange),
    message_type: normalizeLabel(input.messageType),
    queue: normalizeLabel(input.queue),
    routing_key: normalizeLabel(input.routingKey),
    service: input.service,
  };
}

function normalizeLabel(value: LabelValue): string {
  if (value === undefined || value === '') {
    return 'unknown';
  }

  return String(value);
}

function getOrCreateCounter<TLabels extends string>(
  name: string,
  help: string,
  labelNames: readonly TLabels[],
): Counter<TLabels> {
  return getOrCreateMetric(name, () => new Counter({ help, labelNames, name, registers: [registry] }));
}

function getOrCreateHistogram<TLabels extends string>(
  name: string,
  help: string,
  labelNames: readonly TLabels[],
  buckets: readonly number[],
): Histogram<TLabels> {
  return getOrCreateMetric(
    name,
    () => new Histogram({ buckets: [...buckets], help, labelNames, name, registers: [registry] }),
  );
}

function getOrCreateMetric<TMetric extends Metric<string>>(
  name: string,
  createMetric: () => TMetric,
): TMetric {
  return (registry.getSingleMetric(name) as TMetric | undefined) ?? createMetric();
}

const httpRequestsTotal = getOrCreateCounter(
  'http_requests_total',
  'Total HTTP requests processed by service.',
  ['service', 'method', 'route', 'status_code'],
);
const httpRequestsErrorsTotal = getOrCreateCounter(
  'http_requests_errors_total',
  'Total HTTP requests with 4xx or 5xx responses.',
  ['service', 'method', 'route', 'status_code'],
);
const httpRequestDurationSeconds = getOrCreateHistogram(
  'http_request_duration_seconds',
  'HTTP request duration in seconds.',
  ['service', 'method', 'route', 'status_code'],
  [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
);

const rabbitMqLabelNames = ['service', 'exchange', 'queue', 'routing_key', 'message_type'] as const;
const rabbitMqMessagesPublishedTotal = getOrCreateCounter(
  'rabbitmq_messages_published_total',
  'Total RabbitMQ messages published.',
  rabbitMqLabelNames,
);
const rabbitMqMessagesConsumedTotal = getOrCreateCounter(
  'rabbitmq_messages_consumed_total',
  'Total RabbitMQ messages consumed successfully.',
  rabbitMqLabelNames,
);
const rabbitMqMessagesFailedTotal = getOrCreateCounter(
  'rabbitmq_messages_failed_total',
  'Total RabbitMQ messages that failed while processing.',
  rabbitMqLabelNames,
);
const rabbitMqMessagesRetriedTotal = getOrCreateCounter(
  'rabbitmq_messages_retried_total',
  'Total RabbitMQ messages scheduled for retry.',
  rabbitMqLabelNames,
);
const rabbitMqDeadLetterMessagesTotal = getOrCreateCounter(
  'rabbitmq_dead_letter_messages_total',
  'Total RabbitMQ messages sent to dead-letter handling.',
  rabbitMqLabelNames,
);

const checkoutStartedTotal = getOrCreateCounter(
  'checkout_started_total',
  'Total checkout sessions started.',
  ['service'],
);
const checkoutCompletedTotal = getOrCreateCounter(
  'checkout_completed_total',
  'Total checkout sessions completed.',
  ['service'],
);
const checkoutFailedTotal = getOrCreateCounter(
  'checkout_failed_total',
  'Total checkout sessions failed.',
  ['service'],
);
const checkoutDurationSeconds = getOrCreateHistogram(
  'checkout_duration_seconds',
  'Checkout duration in seconds.',
  ['service'],
  [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
);

const ordersCreatedTotal = getOrCreateCounter('orders_created_total', 'Total orders created.', [
  'service',
]);
const ordersConfirmedTotal = getOrCreateCounter(
  'orders_confirmed_total',
  'Total orders confirmed.',
  ['service'],
);
const ordersCancelledTotal = getOrCreateCounter(
  'orders_cancelled_total',
  'Total orders cancelled.',
  ['service'],
);
const ordersFailedTotal = getOrCreateCounter('orders_failed_total', 'Total orders failed.', [
  'service',
]);

const paymentLabelNames = ['service', 'provider', 'status'] as const;
const paymentsCreatedTotal = getOrCreateCounter(
  'payments_created_total',
  'Total payments created.',
  paymentLabelNames,
);
const paymentsSucceededTotal = getOrCreateCounter(
  'payments_succeeded_total',
  'Total payments succeeded.',
  paymentLabelNames,
);
const paymentsFailedTotal = getOrCreateCounter(
  'payments_failed_total',
  'Total payments failed.',
  paymentLabelNames,
);
const paymentsPendingTotal = getOrCreateCounter(
  'payments_pending_total',
  'Total payments pending.',
  paymentLabelNames,
);

const stockReservationsTotal = getOrCreateCounter(
  'stock_reservations_total',
  'Total stock reservations.',
  ['service'],
);
const stockReservationsFailedTotal = getOrCreateCounter(
  'stock_reservations_failed_total',
  'Total failed stock reservations.',
  ['service'],
);
const stockReservationsConfirmedTotal = getOrCreateCounter(
  'stock_reservations_confirmed_total',
  'Total confirmed stock reservations.',
  ['service'],
);
const stockReservationsReleasedTotal = getOrCreateCounter(
  'stock_reservations_released_total',
  'Total released stock reservations.',
  ['service'],
);
const stockLowItemsTotal = getOrCreateCounter(
  'stock_low_items_total',
  'Total low-stock inventory items observed.',
  ['service'],
);

const authLoginSuccessTotal = getOrCreateCounter(
  'auth_login_success_total',
  'Total successful auth login attempts.',
  ['service'],
);
const authLoginFailedTotal = getOrCreateCounter(
  'auth_login_failed_total',
  'Total failed auth login attempts.',
  ['service'],
);
const authRegisterSuccessTotal = getOrCreateCounter(
  'auth_register_success_total',
  'Total successful auth registration attempts.',
  ['service'],
);
const authRegisterFailedTotal = getOrCreateCounter(
  'auth_register_failed_total',
  'Total failed auth registration attempts.',
  ['service'],
);
