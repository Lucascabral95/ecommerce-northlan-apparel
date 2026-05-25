# Local Development

This document covers local infrastructure, the implemented service flows and the live browser E2E harness for the Northlane checkout path.

## Requirements

- Docker Desktop with Linux containers or a compatible Docker Engine.
- Docker Compose v2.
- `make`.
- Node.js and npm for monorepo commands.

## Environment

Copy `.env.example` to `.env` if you need to customize ports or credentials.

Default infrastructure values:

| Variable                            | Default                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `POSTGRES_USER`                     | `northlane`                                                                                      |
| `POSTGRES_PASSWORD`                 | `northlane`                                                                                      |
| `POSTGRES_DB`                       | `northlane_platform`                                                                             |
| `POSTGRES_PORT`                     | `5432`                                                                                           |
| `RABBITMQ_DEFAULT_USER`             | `northlane`                                                                                      |
| `RABBITMQ_DEFAULT_PASS`             | `northlane`                                                                                      |
| `RABBITMQ_AMQP_PORT`                | `5672`                                                                                           |
| `RABBITMQ_MANAGEMENT_PORT`          | `15672`                                                                                          |
| `REDIS_PORT`                        | `6379`                                                                                           |
| `API_GATEWAY_PORT`                  | `4000`                                                                                           |
| `API_CORS_ORIGIN`                   | `http://localhost:3000`                                                                          |
| `API_RATE_LIMIT_TTL_MS`             | `60000`                                                                                          |
| `API_RATE_LIMIT_LIMIT`              | `100`                                                                                            |
| `JWT_ACCESS_SECRET`                 | `replace-with-a-strong-local-secret`                                                             |
| `JWT_ACCESS_EXPIRES_IN_SECONDS`     | `900`                                                                                            |
| `JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS` | `30`                                                                                             |
| `BCRYPT_SALT_ROUNDS`                | `12`                                                                                             |
| `CATALOG_SERVICE_PORT`              | `4103`                                                                                           |
| `CATALOG_DATABASE_URL`              | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=catalog_service`      |
| `INVENTORY_SERVICE_PORT`            | `4104`                                                                                           |
| `INVENTORY_RESERVATION_TTL_SECONDS` | `900`                                                                                            |
| `INVENTORY_DATABASE_URL`            | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=inventory_service`    |
| `CART_SERVICE_PORT`                 | `4105`                                                                                           |
| `CART_DATABASE_URL`                 | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=cart_service`         |
| `ORDER_SERVICE_PORT`                | `4106`                                                                                           |
| `ORDER_DATABASE_URL`                | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=order_service`        |
| `PAYMENT_SERVICE_PORT`              | `4107`                                                                                           |
| `PAYMENT_PROVIDER`                  | `MOCK`                                                                                           |
| `PAYMENT_PROVIDER_MODE`             | `MOCK`                                                                                           |
| `PAYMENT_MOCK_FAILURE_AMOUNT`       | `13.37`                                                                                          |
| `PAYMENT_MOCK_FORCE_FAILURE`        | `false`                                                                                          |
| `FRONTEND_BASE_URL`                 | `http://localhost:3000`                                                                          |
| `API_GATEWAY_BASE_URL`              | `http://localhost:4000/api/v1`                                                                   |
| `MERCADO_PAGO_ACCESS_TOKEN`         | empty                                                                                            |
| `MERCADO_PAGO_PUBLIC_KEY`           | empty                                                                                            |
| `MERCADO_PAGO_WEBHOOK_SECRET`       | empty                                                                                            |
| `MERCADO_PAGO_WEBHOOK_URL`          | `http://localhost:4000/api/v1/payments/mercado-pago/webhook`                                     |
| `MERCADO_PAGO_SUCCESS_URL`          | `http://localhost:3000/es/payment/success`                                                       |
| `MERCADO_PAGO_FAILURE_URL`          | `http://localhost:3000/es/payment/failure`                                                       |
| `MERCADO_PAGO_PENDING_URL`          | `http://localhost:3000/es/payment/pending`                                                       |
| `MERCADO_PAGO_NOTIFICATION_URL`     | `http://localhost:4000/api/v1/payments/mercado-pago/webhook`                                     |
| `PAYMENT_DATABASE_URL`              | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=payment_service`      |
| `NOTIFICATION_SERVICE_PORT`         | `4108`                                                                                           |
| `NOTIFICATION_DATABASE_URL`         | `postgresql://northlane:northlane@localhost:5432/northlane_platform?schema=notification_service` |

## Commands

```bash
make images
make infra-up
make bootstrap
make up
make start
make dev
make logs
make down
make test-e2e-live
```

`make up` builds and starts:

- RabbitMQ with Management UI.
- PostgreSQL with a persistent Docker volume.
- Redis with append-only persistence.
- Auth, User, Catalog, Inventory, Cart, Order, Payment and Notification services.
- API Gateway.
- Next.js storefront.

`make up` is the complete first-run command:

```bash
make up
```

It applies Prisma migrations, seeds the catalog and synchronizes Inventory Service before starting application containers. That keeps registration, catalog and checkout functional on a new Docker volume.

Use the smaller targets when you need control:

```bash
make infra-up
make bootstrap
make start
```

`make start` skips bootstrap and is the faster restart path once Docker volumes already contain the prepared schemas and seed data.

Docker builds one shared backend image for API Gateway and all NestJS services, plus a standalone Next.js web image. That keeps the microservice containers separate at runtime without storing a separate Node dependency tree for every backend service.

## Local URLs

| Service                     | URL                                     |
| --------------------------- | --------------------------------------- |
| Web storefront              | `http://localhost:3000`                 |
| API Gateway health          | `http://localhost:4000/api/v1/health`   |
| Auth Service health         | `http://localhost:4101/health`          |
| User Service health         | `http://localhost:4102/health`          |
| Product catalog             | `http://localhost:4000/api/v1/products` |
| Catalog Service health      | `http://localhost:4103/health`          |
| Inventory Service health    | `http://localhost:4104/health`          |
| Cart Service health         | `http://localhost:4105/health`          |
| Order Service health        | `http://localhost:4106/health`          |
| Payment Service health      | `http://localhost:4107/health`          |
| Notification Service health | `http://localhost:4108/health`          |
| RabbitMQ Management UI      | `http://localhost:15672`                |
| PostgreSQL                  | `localhost:5432`                        |
| Redis                       | `localhost:6379`                        |

RabbitMQ credentials default to `northlane / northlane`.

## Live E2E

The repository includes a real browser E2E harness that uses:

- Docker Compose for `rabbitmq`, `postgres` and `redis`.
- real NestJS service processes on isolated ports.
- real Prisma schema resets inside an isolated E2E database.
- authoritative inventory bootstrap from the seeded catalog variants.
- Playwright against the Next.js storefront and API Gateway.

Run it with:

```bash
npm run test:e2e:live
make test-e2e-live
```

The harness uses `e2e/live.env`, not your root `.env`, so it does not reuse development ports or the main development database.

Default live E2E ports:

| Service                     | URL                                      |
| --------------------------- | ---------------------------------------- |
| Web storefront             | `http://127.0.0.1:3100`                  |
| API Gateway health         | `http://127.0.0.1:4100/api/v1/health`    |
| RabbitMQ Management UI     | `http://127.0.0.1:15673`                 |
| PostgreSQL                 | `127.0.0.1:5434`                         |
| Redis                      | `127.0.0.1:6381`                         |

The browser test covers:

1. user registration
2. catalog navigation
3. product detail and add-to-bag
4. checkout against the live saga
5. confirmed order detail
6. order history persistence

Logs and Playwright artifacts are written to `tmp/e2e-live`.

If the run fails:

1. Inspect `tmp/e2e-live/logs` for the service or command that crashed first.
2. Set `NORTHLANE_E2E_KEEP_STACK=1` before the command if you need the Docker stack to stay up for manual debugging.
3. Verify Microsoft Edge is installed, or install a Playwright browser and override `PLAYWRIGHT_BROWSER_CHANNEL`.
4. If ports are already in use, edit `e2e/live.env` rather than the main `.env`.

## Database Migrations

Auth, User, Catalog, Inventory, Cart, Order, Payment and Notification services own separate PostgreSQL schemas through Prisma.

```bash
npm run prisma:migrate --workspace @northlane/auth-service
npm run prisma:migrate --workspace @northlane/user-service
npm run prisma:migrate --workspace @northlane/catalog-service
npm run prisma:migrate --workspace @northlane/inventory-service
npm run prisma:migrate --workspace @northlane/cart-service
npm run prisma:migrate --workspace @northlane/order-service
npm run prisma:migrate --workspace @northlane/payment-service
npm run prisma:migrate --workspace @northlane/notification-service
npm run seed --workspace @northlane/catalog-service
```

The required URLs are `AUTH_DATABASE_URL`, `USER_DATABASE_URL`, `CATALOG_DATABASE_URL`, `INVENTORY_DATABASE_URL`, `CART_DATABASE_URL`, `ORDER_DATABASE_URL`, `PAYMENT_DATABASE_URL` and `NOTIFICATION_DATABASE_URL`.

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

## Phase 10 Payment Flow

1. `payment-service` consumes `payment.command.request_payment` from `payment.exchange`.
2. `PAYMENT_PROVIDER=MOCK` keeps local development deterministic and remains the default.
3. Payment requests are persisted in the `payment_service` schema with idempotency by `orderId` and `idempotencyKey`.
4. Repeating the same `orderId`, `idempotencyKey` and payload returns the original payment without creating duplicate rows or events.
5. Reusing the same `orderId` or `idempotencyKey` with a different payload returns an idempotency conflict.
6. A normal MOCK payment is saved as `APPROVED` and publishes `payment.event.payment_succeeded`.
7. A MOCK payment is saved as `REJECTED` and publishes `payment.event.payment_failed` when `metadata.simulateFailure`, `metadata.forceFailure`, `metadata.mockOutcome: "REJECTED"` or the configured `PAYMENT_MOCK_FAILURE_AMOUNT` is used.
8. `PAYMENT_PROVIDER=MERCADO_PAGO` creates a Checkout Pro preference and returns a `checkoutUrl` to the frontend.
9. Mercado Pago webhooks enter through `POST /api/v1/payments/mercado-pago/webhook`; API Gateway delegates processing to Payment Service through RabbitMQ.
10. Payment Service stores webhook events idempotently, consults Mercado Pago for the real payment status and only then publishes final payment events.

For Mercado Pago sandbox testing, configure `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY` and public webhook/back URLs. Local webhook testing usually requires a tunnel such as ngrok or cloudflared because Mercado Pago must call the API Gateway from the public internet.

## Phase 11 Notification Flow

1. `notification-service` consumes `auth.event.user_registered`, `order.event.order_created`, `payment.event.payment_succeeded`, `payment.event.payment_failed`, `order.event.order_confirmed` and `order.event.order_cancelled`.
2. Every consumed event creates a row in the `notification_service.notifications` table.
3. Email delivery is simulated only: no real provider is called and no real email leaves the system.
4. Simulated delivery writes a structured JSON log with `notificationId`, `userId`, `type`, `subject` and correlation metadata.
5. Notification consumers declare `notification.events.queue` with a dead-letter exchange and route failed messages to `notification.events.dlq`.

## Scope Notes

- Redis is available for later caching and distributed throttling use cases, but application state does not depend on it yet.
- Catalog variant stock fields remain merchandising snapshots; authoritative reservations and stock movements belong to Inventory Service.
- Notification Service does not send real email; integration with SES or another provider remains deferred.
- API Gateway rate limiting uses in-memory throttling; Redis-backed distributed throttling remains deferred.
- Prometheus is intentionally deferred until services expose production metrics.
