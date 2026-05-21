# Local Development

This document covers local infrastructure, the API Gateway foundation, the Phase 5 auth/user flow, the Phase 6 catalog flow, the Phase 7 inventory flow, the Phase 8 cart flow and the Phase 9 order flow. Payment confirmation, cart finalization and notifications are still intentionally out of scope.

## Requirements

- Docker Desktop or a compatible Docker Engine.
- Docker Compose v2.
- `make`.
- Node.js and npm for monorepo commands.

## Environment

Copy `.env.example` to `.env` if you need to customize ports or credentials.

Default infrastructure values:

| Variable                            | Default                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`                     | `northlane`                                                                                   |
| `POSTGRES_PASSWORD`                 | `northlane`                                                                                   |
| `POSTGRES_DB`                       | `northlane_platform`                                                                          |
| `POSTGRES_PORT`                     | `5432`                                                                                        |
| `RABBITMQ_DEFAULT_USER`             | `northlane`                                                                                   |
| `RABBITMQ_DEFAULT_PASS`             | `northlane`                                                                                   |
| `RABBITMQ_AMQP_PORT`                | `5672`                                                                                        |
| `RABBITMQ_MANAGEMENT_PORT`          | `15672`                                                                                       |
| `REDIS_PORT`                        | `6379`                                                                                        |
| `API_GATEWAY_PORT`                  | `4000`                                                                                        |
| `API_CORS_ORIGIN`                   | `http://localhost:3000`                                                                       |
| `API_RATE_LIMIT_TTL_MS`             | `60000`                                                                                       |
| `API_RATE_LIMIT_LIMIT`              | `100`                                                                                         |
| `JWT_ACCESS_SECRET`                 | `replace-with-a-strong-local-secret`                                                          |
| `JWT_ACCESS_EXPIRES_IN_SECONDS`     | `900`                                                                                         |
| `JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS` | `30`                                                                                          |
| `BCRYPT_SALT_ROUNDS`                | `12`                                                                                          |
| `CATALOG_SERVICE_PORT`              | `4103`                                                                                        |
| `CATALOG_DATABASE_URL`              | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=catalog_service`   |
| `INVENTORY_SERVICE_PORT`            | `4104`                                                                                        |
| `INVENTORY_RESERVATION_TTL_SECONDS` | `900`                                                                                         |
| `INVENTORY_DATABASE_URL`            | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=inventory_service` |
| `CART_SERVICE_PORT`                 | `4105`                                                                                        |
| `CART_DATABASE_URL`                 | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=cart_service`      |
| `ORDER_SERVICE_PORT`                | `4106`                                                                                        |
| `ORDER_DATABASE_URL`                | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=order_service`     |

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

| Service                  | URL                                     |
| ------------------------ | --------------------------------------- |
| API Gateway health       | `http://localhost:4000/api/v1/health`   |
| Product catalog          | `http://localhost:4000/api/v1/products` |
| Catalog Service health   | `http://localhost:4103/health`          |
| Inventory Service health | `http://localhost:4104/health`          |
| Cart Service health      | `http://localhost:4105/health`          |
| Order Service health     | `http://localhost:4106/health`          |
| RabbitMQ Management UI   | `http://localhost:15672`                |
| PostgreSQL               | `localhost:5432`                        |
| Redis                    | `localhost:6379`                        |

RabbitMQ credentials default to `northlane / northlane`.

## Database Migrations

Auth, User, Catalog, Inventory, Cart and Order services own separate PostgreSQL schemas through Prisma.

```bash
npm run prisma:migrate --workspace @northlane/auth-service
npm run prisma:migrate --workspace @northlane/user-service
npm run prisma:migrate --workspace @northlane/catalog-service
npm run prisma:migrate --workspace @northlane/inventory-service
npm run prisma:migrate --workspace @northlane/cart-service
npm run prisma:migrate --workspace @northlane/order-service
npm run seed --workspace @northlane/catalog-service
```

The required URLs are `AUTH_DATABASE_URL`, `USER_DATABASE_URL`, `CATALOG_DATABASE_URL`, `INVENTORY_DATABASE_URL`, `CART_DATABASE_URL` and `ORDER_DATABASE_URL`.

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

## Phase 7 Inventory Flow

1. `PATCH /api/v1/admin/products/:id/stock` sends `inventory.command.adjust_stock` through RabbitMQ.
2. `inventory-service` creates or updates `inventory_items` and records a stock movement.
3. Future order flows will send `inventory.command.reserve_stock`, `inventory.command.confirm_stock` and `inventory.command.release_stock`.
4. Stock reservation uses row-level locks in PostgreSQL and updates `reserved_stock` only when every item has enough available stock.
5. Reservation, confirmation, release and adjustment publish inventory events through RabbitMQ.

## Phase 8 Cart Flow

1. `GET /api/v1/cart` sends `cart.command.get_cart` through RabbitMQ and creates an empty active cart if needed.
2. `POST /api/v1/cart/items` sends `cart.command.add_item`; `cart-service` validates the product and variant against `catalog-service` through request/reply.
3. If the same variant is already in the cart, quantity is incremented instead of creating a duplicate row.
4. Product title, slug, image, selected size/color, SKU and unit price are stored as snapshots in `cart_items`.
5. `PATCH`, `DELETE /items/:itemId` and `DELETE /cart` update the active cart and return recalculated totals.

## Phase 9 Order Flow

1. `POST /api/v1/checkout` sends `order.command.create_order` through RabbitMQ. The request must include an `Idempotency-Key` header or `idempotencyKey` body field.
2. `order-service` reads the authenticated user's active cart through `cart.command.get_cart`.
3. The order is persisted in the `order_service` schema with product snapshots, totals, `PENDING` status and initial status history.
4. Repeating the same idempotency key with the same checkout payload returns the original order.
5. Reusing the same idempotency key with a different checkout payload returns a conflict.
6. New orders publish `order.event.order_created` and prepare the saga by publishing `inventory.command.reserve_stock`.
7. `GET /api/v1/orders` and `GET /api/v1/orders/:id` read order history and detail through RabbitMQ request/reply.
8. Admin order status changes use `order.command.update_status` and append immutable status history.

## Scope Notes

- Full dead-letter queues and retry policies are not implemented yet.
- Redis is available for later caching/rate-limit/session use cases, but no application code uses it yet.
- Catalog variant stock fields are historical merchandising data from Phase 6; authoritative reservations and stock movements now belong to Inventory Service.
- Cart does not reserve stock. Order creation now starts stock reservation, but the full payment/confirmation saga remains deferred.
- API Gateway rate limiting uses in-memory throttling for now; Redis-backed distributed throttling is intentionally deferred.
- Prometheus is intentionally deferred until services expose production metrics.
