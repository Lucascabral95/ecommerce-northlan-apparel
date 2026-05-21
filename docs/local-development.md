# Local Development

This document covers local infrastructure, the API Gateway foundation, the Phase 5 auth/user flow and the Phase 6 catalog flow. Cart, checkout, inventory reservation and payment workflows are still intentionally out of scope.

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
| `CATALOG_SERVICE_PORT` | `4103` |
| `CATALOG_DATABASE_URL` | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=catalog_service` |

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
| Product catalog | `http://localhost:4000/api/v1/products` |
| Catalog Service health | `http://localhost:4103/health` |
| RabbitMQ Management UI | `http://localhost:15672` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

RabbitMQ credentials default to `northlane / northlane`.

## Database Migrations

Auth, User and Catalog services own separate PostgreSQL schemas through Prisma.

```bash
npm run prisma:migrate --workspace @northlane/auth-service
npm run prisma:migrate --workspace @northlane/user-service
npm run prisma:migrate --workspace @northlane/catalog-service
npm run seed --workspace @northlane/catalog-service
```

The required URLs are `AUTH_DATABASE_URL`, `USER_DATABASE_URL` and `CATALOG_DATABASE_URL`.

## Phase 5 Flow

1. `POST /api/v1/auth/register` sends `auth.command.register` through RabbitMQ.
2. `auth-service` stores credentials, creates tokens and publishes `auth.event.user_registered`.
3. `user-service` consumes `auth.event.user_registered` and creates the initial profile.
4. `POST /api/v1/auth/login` returns a JWT access token.
5. `GET /api/v1/me`, `PATCH /api/v1/me/profile` and address endpoints use RabbitMQ request/reply to `user-service`.

## Phase 6 Catalog Flow

1. `GET /api/v1/products` sends `catalog.command.list_products` through RabbitMQ.
2. `catalog-service` queries its own `catalog_service` schema and returns products with variants, images and available stock derived from `stock - reservedStock`.
3. `GET /api/v1/products/:slug` sends `catalog.command.get_product`.
4. `GET /api/v1/categories` sends `catalog.command.get_categories`.
5. Admin product create/update endpoints send `catalog.command.create_product` and `catalog.command.update_product`; they require an ADMIN JWT issued with the shared local `JWT_ACCESS_SECRET`.

## Scope Notes

- Full dead-letter queues and retry policies are not implemented yet.
- Redis is available for later caching/rate-limit/session use cases, but no application code uses it yet.
- Catalog stock fields are initial merchandising data only. Stock reservation and overselling protection remain owned by the future Inventory Service.
- API Gateway rate limiting uses in-memory throttling for now; Redis-backed distributed throttling is intentionally deferred.
- Prometheus is intentionally deferred until services expose production metrics.
