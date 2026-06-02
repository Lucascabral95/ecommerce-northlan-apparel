# Northlane Apparel Observability

This phase adds a local observability stack for the Docker Compose environment only. It does not include AWS, Terraform, deploy automation, or hosted monitoring.

## Architecture

The stack has four local components:

- Prometheus scrapes `/metrics` from the API Gateway, every backend service, RabbitMQ, and itself.
- Grafana provides dashboards and queries over Prometheus and Loki.
- Loki stores centralized container logs.
- Grafana Alloy reads Docker container logs and sends them to Loki.

Each NestJS backend exposes:

- `GET /health`
- `GET /metrics`

The API Gateway keeps its global prefix:

- `GET /api/v1/health`
- `GET /api/v1/metrics`

## Local URLs

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- Loki readiness: http://localhost:3100/ready
- Loki metrics: http://localhost:3100/metrics
- RabbitMQ management: http://localhost:15672
- RabbitMQ Prometheus metrics: http://localhost:15692/metrics

Grafana local credentials:

- User: `admin`
- Password: `admin`

## Run The Stack

```powershell
make up
```

To inspect only observability logs:

```powershell
make observability-logs
```

To validate the Compose file:

```powershell
docker compose config
```

## Metrics

HTTP metrics:

- `http_requests_total`
- `http_request_duration_seconds`
- `http_requests_errors_total`

RabbitMQ metrics:

- `rabbitmq_messages_published_total`
- `rabbitmq_messages_consumed_total`
- `rabbitmq_messages_failed_total`
- `rabbitmq_messages_retried_total`
- `rabbitmq_dead_letter_messages_total`

Checkout and order metrics:

- `checkout_started_total`
- `checkout_completed_total`
- `checkout_failed_total`
- `checkout_duration_seconds`
- `orders_created_total`
- `orders_confirmed_total`
- `orders_cancelled_total`
- `orders_failed_total`

Payment metrics:

- `payments_created_total`
- `payments_succeeded_total`
- `payments_failed_total`
- `payments_pending_total`

Inventory metrics:

- `stock_reservations_total`
- `stock_reservations_failed_total`
- `stock_reservations_confirmed_total`
- `stock_reservations_released_total`
- `stock_low_items_total`

Auth metrics:

- `auth_login_success_total`
- `auth_login_failed_total`
- `auth_register_success_total`
- `auth_register_failed_total`

## Dashboard

Grafana provisions the dashboard automatically from:

```text
infra/docker/grafana/dashboards/northlane-observability.json
```

Dashboard name:

```text
Northlane Apparel — Observability Overview
```

Main panels:

1. HTTP Request Rate by Service
2. HTTP Error Rate by Service
3. HTTP Latency p95 by Service
4. RabbitMQ Messages Consumed by Service
5. RabbitMQ Failed Messages and DLQ
6. Checkout Funnel
7. Orders by Status
8. Payments Success vs Failure
9. Stock Reservation Failures

An additional Loki panel shows recent error logs.

## Logs

All backend services write JSON logs to stdout/stderr. Alloy collects Docker logs and sends them to Loki.

Common fields:

- `timestamp`
- `level`
- `service`
- `message`
- `correlationId`
- `requestId`
- `route`
- `method`
- `statusCode`
- `durationMs`
- `exchange`
- `queue`
- `routingKey`
- `eventType`
- `orderId`
- `paymentId`
- `error`

Sensitive values are redacted when passed as structured logger metadata:

- passwords
- tokens
- secrets
- authorization values

Stack traces are only emitted outside `NODE_ENV=production`.

## Loki Queries

Search logs by service:

```logql
{service="order-service"}
```

Search logs by correlationId:

```logql
{correlationId="PASTE_CORRELATION_ID"}
```

Search errors:

```logql
{environment="local"} |= "error"
```

Search checkout events:

```logql
{service="order-service"} |= "checkout"
```

Search payment events:

```logql
{service="payment-service"} |= "payment"
```

## Troubleshooting

If Prometheus targets are down:

- Confirm the backend services are healthy with `docker compose ps`.
- Open the target service `/metrics` endpoint directly.
- Check Prometheus targets at http://localhost:9090/targets.

If Grafana has no dashboard:

- Restart Grafana with `docker compose restart grafana`.
- Check provisioning logs with `docker compose logs grafana`.
- Confirm the dashboard file exists under `infra/docker/grafana/dashboards`.

If Loki has no logs:

- Confirm Alloy is running with `docker compose ps alloy`.
- Check Alloy logs with `docker compose logs alloy`.
- Confirm Docker socket mount works on your host.
- Query `{environment="local"}` in Grafana Explore.

If RabbitMQ metrics are unavailable:

- Confirm `rabbitmq_prometheus` is enabled through `infra/docker/rabbitmq/enabled_plugins`.
- Open http://localhost:15692/metrics.
- Restart RabbitMQ if the plugin file was added after the container already existed.
