# Local Development

This document covers local infrastructure, the API Gateway foundation and the Phase 5 auth/user flow. Catalog, cart, checkout and payment workflows are still intentionally out of scope.

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
| `JWT_ACCESS_SECRET` | `replace-with-a-strong-local-secret` |
| `JWT_ACCESS_EXPIRES_IN_SECONDS` | `900` |
| `JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS` | `30` |
| `BCRYPT_SALT_ROUNDS` | `12` |

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

## Database Migrations

Auth and User services own separate PostgreSQL schemas through Prisma.

```bash
npm run prisma:migrate --workspace @northlane/auth-service
npm run prisma:migrate --workspace @northlane/user-service
```

The required URLs are `AUTH_DATABASE_URL` and `USER_DATABASE_URL`.

## Phase 5 Flow

1. `POST /api/v1/auth/register` sends `auth.command.register` through RabbitMQ.
2. `auth-service` stores credentials, creates tokens and publishes `auth.event.user_registered`.
3. `user-service` consumes `auth.event.user_registered` and creates the initial profile.
4. `POST /api/v1/auth/login` returns a JWT access token.
5. `GET /api/v1/me`, `PATCH /api/v1/me/profile` and address endpoints use RabbitMQ request/reply to `user-service`.

## Scope Notes

- Full dead-letter queues and retry policies are not implemented yet.
- Redis is available for later caching/rate-limit/session use cases, but no application code uses it yet.
- API Gateway rate limiting uses in-memory throttling for now; Redis-backed distributed throttling is intentionally deferred.
- Prometheus is intentionally deferred until services expose production metrics.
