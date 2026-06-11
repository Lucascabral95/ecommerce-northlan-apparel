# Testing And CI

This document defines the quality gates for Northlane Apparel. The goal is to keep local development, pull requests and AWS deployment changes aligned without relying on slow or flaky checks for day-to-day feedback.

## Local Doctor

Run the project doctor before debugging local or AWS issues:

```powershell
make doctor
```

If `make.exe` is blocked by Windows App Control:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\local-stack.ps1 doctor
```

The doctor validates:

- `.env` and `.env.example` exist.
- Node.js and npm are available.
- Docker and Docker Compose are available.
- Docker daemon is reachable.
- Terraform and AWS CLI are available.
- AWS CLI authentication is visible as a warning unless strict auth is requested inside the script.
- `PAYMENT_PROVIDER` / `PAYMENT_PROVIDER_MODE` is valid.
- Mercado Pago credentials are present when `PAYMENT_PROVIDER=MERCADO_PAGO`.
- `docker compose config --quiet` passes.

## Standard Local Quality Gate

Use this sequence before pushing meaningful changes:

```bash
npm run prisma:generate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
docker compose config --quiet
```

For a faster loop while editing one package, run workspace-specific commands:

```bash
npm test --workspace @northlane/payment-service
npm run typecheck --workspace @northlane/order-service
npm run lint --workspace @northlane/shared
```

## Test Layers

| Layer | Command | Purpose |
| ----- | ------- | ------- |
| Unit and service tests | `npm test` | Deterministic business behavior with in-memory doubles and mocked providers. |
| Checkout saga smoke | `npm run test:e2e` | Order Service checkout success/failure flow without a live broker. |
| Live browser E2E | `npm run test:e2e:live` | Full Docker-backed browser checkout using real services and local infrastructure. |
| Docker config | `docker compose config --quiet` | Validates Compose syntax and environment interpolation. |
| Build | `npm run build` | Ensures apps, services and shared packages compile. |

## Checkout And Payment Coverage

Critical checkout/payment coverage lives in:

- `services/order-service/src/order/order.service.spec.ts`
- `services/payment-service/src/payment/payment.service.spec.ts`
- `services/payment-service/src/payment/mercado-pago-payment.provider.spec.ts`
- `services/payment-service/src/payment/payment-status.mapper.spec.ts`
- `services/payment-service/src/payment/mercado-pago-webhook-signature.spec.ts`

The suite covers:

- MOCK checkout approval.
- MOCK checkout failure and stock release.
- Mercado Pago preference creation.
- Payment idempotency by order/idempotency key/request hash.
- Mercado Pago webhook idempotency.
- Mercado Pago return-status synchronization by payment id.
- Mercado Pago return-status synchronization by order external reference.

## GitHub Actions

The main workflow is `.github/workflows/ci.yml`.

It runs on:

- pull requests to `main`
- pushes to `main`
- manual dispatch

Jobs:

- `quality`: installs dependencies, generates Prisma clients, runs lint, typecheck and deterministic tests.
- `build`: generates Prisma clients and builds the monorepo.
- `integration`: starts PostgreSQL, applies Prisma migrations and runs checkout saga smoke tests.
- `docker`: validates Docker Compose and builds the local app images.

## CI Rules

- Do not commit real secrets.
- Keep CI deterministic by using `PAYMENT_PROVIDER_MODE=MOCK` unless a test explicitly mocks Mercado Pago.
- Do not call real Mercado Pago APIs from CI.
- Do not require AWS credentials in pull request checks.
- Keep live browser E2E manual/local unless a dedicated runner and time budget are added.

## Troubleshooting

If `make up` fails early, run:

```powershell
make doctor
docker compose config --quiet
docker compose logs --tail=200 payment-service order-service api-gateway
```

If checkout stays pending after Mercado Pago approval, inspect:

- `payment-service` logs for provider sync or webhook handling.
- `api-gateway` logs for `/api/v1/payments/sync-status`.
- Order history status transitions.
- `MERCADO_PAGO_HTTP_DEMO_MODE` and public return/webhook URLs.
