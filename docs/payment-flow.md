# Payment Flow

Northlane Apparel keeps Payment Service as the owner of payment state. The frontend talks only to API Gateway and internal services continue to communicate through RabbitMQ.

## Providers

Payment Service supports two providers:

| Provider | Purpose |
| -------- | ------- |
| `MOCK` | Default local and test provider. It approves payments unless the request asks for a failure or uses the configured failure amount. |
| `MERCADO_PAGO` | Real Mercado Pago Checkout Pro provider. It creates payment preferences, stores provider identifiers and resolves final status from provider webhooks. |

Set the provider with:

```bash
PAYMENT_PROVIDER=MOCK
```

`PAYMENT_PROVIDER_MODE` is still accepted for backward compatibility, but new environments should use `PAYMENT_PROVIDER`.

## Mercado Pago Checkout Pro

When `PAYMENT_PROVIDER=MERCADO_PAGO`:

1. The customer submits `POST /api/v1/checkout`.
2. API Gateway sends `order.command.create_checkout_session`.
3. Order Service creates the order, reserves stock and requests payment.
4. Payment Service creates a Mercado Pago Checkout Pro preference.
5. Payment Service stores `providerPreferenceId`, `externalReference`, `initPoint`, `sandboxInitPoint` and `checkoutUrl`.
6. API Gateway returns the checkout session to the frontend.
7. The frontend redirects the customer to `checkoutUrl`.
8. Mercado Pago redirects the browser back to the configured success, failure or pending page.
9. Mercado Pago sends a webhook to API Gateway.
10. API Gateway sends `payment.command.process_webhook` to Payment Service.
11. Payment Service validates the webhook signature when configured, deduplicates the event, fetches the real provider payment status and publishes the internal payment event.

The browser redirect is not trusted as proof of payment. Order state changes only from Payment Service events after provider status resolution.

## Environment

Required for Mercado Pago mode:

| Variable | Description |
| -------- | ----------- |
| `PAYMENT_PROVIDER` | Use `MERCADO_PAGO`. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Private access token from Mercado Pago test or production credentials. Do not commit real values. |
| `MERCADO_PAGO_PUBLIC_KEY` | Public key used by frontend integrations if a future UI flow needs it. Checkout Pro redirect does not require exposing it today. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Secret used to validate webhook signatures. Recommended for every shared or public environment. |
| `MERCADO_PAGO_SUCCESS_URL` | Frontend success return URL, for example `http://localhost:3000/es/payment/success`. |
| `MERCADO_PAGO_FAILURE_URL` | Frontend failure return URL. |
| `MERCADO_PAGO_PENDING_URL` | Frontend pending return URL. |
| `MERCADO_PAGO_NOTIFICATION_URL` | Public API Gateway webhook URL. |
| `MERCADO_PAGO_HTTP_DEMO_MODE` | Demo-only mode for plain HTTP ALB. When `true`, Payment Service omits `notification_url` from Checkout Pro preferences and relies on return URL status sync. |
| `FRONTEND_BASE_URL` | Frontend base URL used for safe fallbacks. |
| `API_GATEWAY_BASE_URL` | API Gateway base URL used for safe fallbacks. |

Local `.env.example` values intentionally contain placeholders only.

## AWS HTTP Demo Mode

The preferred Mercado Pago flow uses HTTPS and webhook processing. For a temporary AWS demo on the default plain HTTP ALB, set:

```bash
PAYMENT_PROVIDER=MERCADO_PAGO
MERCADO_PAGO_HTTP_DEMO_MODE=true
```

In Terraform dev, this mode is enabled automatically when `payment_provider = "MERCADO_PAGO"` and no `certificate_arn` is configured. In this mode:

- Checkout Pro still creates a real Mercado Pago preference.
- `back_urls` point to the public ALB frontend URL.
- The browser return page reads Mercado Pago's `payment_id` or `collection_id`.
- The frontend calls API Gateway to synchronize payment status with Payment Service.
- Payment Service queries Mercado Pago before publishing success/failure events.
- `notification_url` is omitted from the preference, so webhook delivery is best effort only if configured outside this demo path.

This is only for demos where HTTPS is not available yet. The production completion step is to add HTTPS, set `MERCADO_PAGO_HTTP_DEMO_MODE=false`, and use the webhook URL as the reliable provider notification path.

## Webhook Security

Payment Service treats webhooks as untrusted input:

- The webhook endpoint is public only at API Gateway.
- API Gateway does not mutate payment or order state directly.
- Payment Service validates Mercado Pago signature headers when `MERCADO_PAGO_WEBHOOK_SECRET` is configured.
- Payment Service deduplicates webhook events by provider/resource identifiers.
- Payment Service queries Mercado Pago before publishing final success/failure/cancellation/expiration events.
- Duplicate webhooks return the previously stored payment state instead of creating duplicate payment events.

## Status Mapping

Mercado Pago statuses are normalized before they reach the rest of the system:

| Mercado Pago status | Internal payment status | Order effect |
| ------------------- | ----------------------- | ------------ |
| `approved` | `APPROVED` | Order moves to `PAID` and `CONFIRMED`; inventory is confirmed; cart is cleared. |
| `pending`, `in_process`, `authorized` | `PENDING` or `IN_PROCESS` | Order remains `PAYMENT_PENDING`. |
| `rejected` | `REJECTED` | Order moves to failed/cancelled path; inventory reservation is released. |
| `cancelled` | `CANCELLED` | Order moves to cancelled path; inventory reservation is released. |
| `refunded`, `charged_back` | `REFUNDED` | Payment is recorded as refunded. |
| `expired` | `EXPIRED` | Order moves to cancelled path; inventory reservation is released. |

## Local Testing Notes

`MOCK` remains the recommended provider for deterministic local development and automated tests.

To test Mercado Pago webhooks locally:

1. Use Mercado Pago sandbox credentials.
2. Expose API Gateway with a tunnel such as ngrok or cloudflared.
3. Set `MERCADO_PAGO_NOTIFICATION_URL` to the public tunnel URL ending in `/api/v1/payments/mercado-pago/webhook`.
4. Set localized frontend back URLs to `/es/payment/success`, `/es/payment/failure` and `/es/payment/pending`.
5. Run checkout and confirm that the final order status changes only after webhook processing.
