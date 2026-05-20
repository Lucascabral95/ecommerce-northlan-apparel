# Local Development

This document covers the local infrastructure introduced in Phase 2 and the API Gateway foundation introduced in Phase 3. It does not define application messaging, RabbitMQ topology, database migrations or business workflows yet.

## Requirements

- Docker Desktop or a compatible Docker Engine.
- Docker Compose v2.
- `make`.
- Node.js and npm for monorepo commands.

## Environment

Copy `.env.example` to `.env` if you need to customize ports or credentials.

Default infrastructure values:

| Variable | Default |
|---|---|
| `POSTGRES_USER` | `northlane` |
| `POSTGRES_PASSWORD` | `northlane` |
| `POSTGRES_DB` | `northlane_platform` |
| `POSTGRES_PORT` | `5432` |
| `RABBITMQ_DEFAULT_USER` | `northlane` |
| `RABBITMQ_DEFAULT_PASS` | `northlane` |
| `RABBITMQ_AMQP_PORT` | `5672` |
| `RABBITMQ_MANAGEMENT_PORT` | `15672` |
| `REDIS_PORT` | `6379` |
| `API_GATEWAY_PORT` | `4000` |
| `API_CORS_ORIGIN` | `http://localhost:3000` |
| `API_RATE_LIMIT_TTL_MS` | `60000` |
| `API_RATE_LIMIT_LIMIT` | `100` |

## Commands

```bash
make up
make dev
make logs
make down
```

`make up` starts:

- RabbitMQ with Management UI.
- PostgreSQL with a persistent Docker volume.
- Redis with append-only persistence.

## Local URLs

| Service | URL |
|---|---|
| API Gateway health | `http://localhost:4000/api/v1/health` |
| API Gateway placeholders | `http://localhost:4000/api/v1/products` |
| RabbitMQ Management UI | `http://localhost:15672` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

RabbitMQ credentials default to `northlane / northlane`.

## Scope Notes

- RabbitMQ exchanges, queues, bindings, dead-letter queues and retry policies are not created in Phase 2.
- PostgreSQL migrations are not defined in Phase 2.
- Redis is available for later caching/rate-limit/session use cases, but no application code uses it yet.
- API Gateway rate limiting uses in-memory throttling for now; Redis-backed distributed throttling is intentionally deferred.
- API Gateway placeholder modules do not call RabbitMQ or internal services yet.
- Prometheus is intentionally deferred until services expose production metrics.
