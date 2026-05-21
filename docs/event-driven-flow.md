# Event-Driven Flow

Northlane Apparel uses RabbitMQ as the internal integration boundary. The frontend talks only to API Gateway; services communicate with commands and events over RabbitMQ.

## Message Envelope

Every command and event uses the shared envelope from `@northlane/contracts`:

```ts
{
  eventId: string;
  type: string;
  version: number;
  correlationId: string;
  causationId?: string;
  timestamp: string;
  producer: string;
  payload: unknown;
}
```

`correlationId` follows the full request or saga. `causationId` points to the message that caused the next command or event.

## Exchanges

- `auth.exchange`
- `user.exchange`
- `catalog.exchange`
- `inventory.exchange`
- `cart.exchange`
- `order.exchange`
- `payment.exchange`
- `notification.exchange`

Critical consumers also declare retry exchanges and DLX exchanges, for example `order.retry.exchange`, `payment.retry.exchange`, `inventory.retry.exchange`, `cart.retry.exchange` and their matching `*.dlx` exchanges.

## Checkout Saga

1. API Gateway receives `POST /api/v1/checkout`.
2. API Gateway publishes `order.command.create_order`.
3. Order Service creates an idempotent `PENDING` order with item snapshots.
4. Order Service publishes `inventory.command.reserve_stock`.
5. Inventory Service reserves stock using PostgreSQL row locks and publishes `inventory.event.stock_reserved` or `inventory.event.stock_reservation_failed`.
6. On `stock_reserved`, Order Service moves the order to `STOCK_RESERVED` and `PAYMENT_PENDING`, then publishes `payment.command.request_payment`.
7. Payment Service processes MOCK payment idempotently and publishes `payment.event.payment_succeeded` or `payment.event.payment_failed`.
8. On payment success, Order Service moves the order to `PAID` and `CONFIRMED`, publishes `inventory.command.confirm_stock`, publishes `cart.command.clear_cart` and emits `order.event.order_confirmed`.
9. On payment failure, Order Service moves the order to `FAILED` and `CANCELLED`, publishes `inventory.command.release_stock` and emits `order.event.order_cancelled`.
10. Notification Service consumes order and payment events, persists notification history and logs simulated email delivery.

## Retry And DLQ Strategy

The shared `RabbitMqClient` supports delayed retries with a retry exchange and TTL retry queue. A failed non-RPC consumer message is republished to the retry exchange with `x-retry-count`. After the retry queue TTL expires, RabbitMQ dead-letters it back to the original exchange with a retry routing key bound to the original consumer queue.

After `maxAttempts`, the message is rejected without requeue and RabbitMQ routes it to the configured DLQ. RPC request/reply handlers return structured errors to the requester instead of retrying.

Current retry defaults in handlers:

- `delayMs`: `5000`
- `maxAttempts`: `3`

## Idempotency Boundaries

- Checkout idempotency is owned by Order Service through `idempotency_keys`.
- Stock reservation idempotency is owned by Inventory Service by `orderId`, `reservationId` and `idempotencyKey`.
- Payment idempotency is owned by Payment Service by `orderId` and `idempotencyKey`.
- Final order event handling is idempotent: repeated payment success/failure events do not double-confirm stock, double-release stock or clear the cart twice.
