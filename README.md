# Northlane Apparel

Northlane Apparel is the foundation for a professional event-driven apparel e-commerce platform. The repository is currently in **Phase 2**: it defines the monorepo structure, tooling, service boundaries and local infrastructure without implementing business workflows yet.

## Current Scope

Implemented now:

- npm workspaces.
- Turborepo as a script orchestrator only.
- Strict TypeScript base configuration.
- Minimal Next.js app in `apps/web`.
- Minimal NestJS API Gateway in `apps/api-gateway`.
- Eight NestJS service shells under `services/*`.
- Prisma schema placeholder per service.
- Shared and contracts packages.
- Local Docker Compose infrastructure for RabbitMQ, PostgreSQL and Redis.
- Initial Terraform directory without cloud infrastructure.
- Root Makefile with initial local commands.

Not implemented yet:

- RabbitMQ topology or messaging code.
- Product catalog, cart, checkout, orders or payments.
- Complete frontend UI.
- CI/CD or AWS deployment.

## Target Architecture

```mermaid
flowchart LR
  Web[Next.js Web] --> Gateway[NestJS API Gateway]
  Gateway --> Broker[(RabbitMQ - later phase)]
  Broker --> Auth[Auth Service]
  Broker --> User[User Service]
  Broker --> Catalog[Catalog Service]
  Broker --> Inventory[Inventory Service]
  Broker --> Cart[Cart Service]
  Broker --> Order[Order Service]
  Broker --> Payment[Payment Service]
  Broker --> Notification[Notification Service]
  Auth --> AuthDb[(Auth DB)]
  User --> UserDb[(User DB)]
  Catalog --> CatalogDb[(Catalog DB)]
  Inventory --> InventoryDb[(Inventory DB)]
  Cart --> CartDb[(Cart DB)]
  Order --> OrderDb[(Order DB)]
  Payment --> PaymentDb[(Payment DB)]
  Notification --> NotificationDb[(Notification DB)]
```

## Repository Layout

```text
apps/
  web/
  api-gateway/
services/
  auth-service/
  user-service/
  catalog-service/
  inventory-service/
  cart-service/
  order-service/
  payment-service/
  notification-service/
packages/
  shared/
  contracts/
infra/
  docker/
  terraform/
docs/
```

## Commands

```bash
make install
make dev
make up
make down
make logs
make build
make lint
make test
make clean
```

Equivalent npm commands:

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run clean
```

## Local Infrastructure

`make up` starts the local infrastructure required by later event-driven phases.

| Component | Local URL / Port | Default credentials |
|---|---|---|
| RabbitMQ AMQP | `localhost:5672` | `northlane / northlane` |
| RabbitMQ Management UI | `http://localhost:15672` | `northlane / northlane` |
| PostgreSQL | `localhost:5432` | `northlane / northlane` |
| Redis | `localhost:6379` | none |

Use `make logs` to follow container logs and `make down` to stop the stack. Persistent data is stored in named Docker volumes.

## Service Boundary Intent

- `apps/web`: future customer and admin frontend.
- `apps/api-gateway`: future public HTTP boundary for the frontend.
- `auth-service`: credentials, tokens and roles.
- `user-service`: profiles, addresses and contact data.
- `catalog-service`: products, categories, variants and merchandising data.
- `inventory-service`: stock ownership and reservations.
- `cart-service`: user carts and cart item snapshots.
- `order-service`: checkout saga state and order history.
- `payment-service`: payment processing abstraction.
- `notification-service`: email and notification history.

## Development Notes

Each service has its own `prisma/schema.prisma` file with an isolated datasource placeholder. Domain models and migrations are intentionally deferred until the corresponding service is implemented.

RabbitMQ is available locally as infrastructure, but exchanges, queues, retry policy, DLQs and application messaging code are intentionally deferred to a later phase.
