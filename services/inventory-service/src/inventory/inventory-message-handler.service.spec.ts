import { EXCHANGE_NAMES, ROUTING_KEYS } from '@northlane/contracts';
import { describe, expect, it } from 'vitest';
import { InventoryMessageHandlerService } from './inventory-message-handler.service';

describe('InventoryMessageHandlerService', () => {
  it('configures command retry/DLQ and propagates message context to reservations', async () => {
    const calls: unknown[] = [];
    const inventoryService = {
      reserveStock: async (payload: unknown, context: unknown) => {
        calls.push({ context, payload });
        return { reservationId: 'reservation-1' };
      },
    };
    const rabbitMqClient = new CapturingRabbitMqClient();
    const handler = new InventoryMessageHandlerService(
      inventoryService as never,
      rabbitMqClient as never,
    );

    await handler.onModuleInit();
    const result = await rabbitMqClient.consume({
      correlationId: 'correlation-1',
      eventId: 'command-1',
      payload: {
        idempotencyKey: 'checkout-1',
        items: [],
        orderId: 'order-1',
        userId: 'user-1',
      },
      type: ROUTING_KEYS.inventoryCommandReserveStock,
    });

    expect(rabbitMqClient.subscription).toMatchObject({
      deadLetter: { exchange: EXCHANGE_NAMES.inventoryDeadLetter },
      retry: { exchange: EXCHANGE_NAMES.inventoryRetry, maxAttempts: 3 },
    });
    expect(calls).toEqual([
      {
        context: { causationId: 'command-1', correlationId: 'correlation-1' },
        payload: {
          idempotencyKey: 'checkout-1',
          items: [],
          orderId: 'order-1',
          userId: 'user-1',
        },
      },
    ]);
    expect(result).toEqual({ reservationId: 'reservation-1' });
  });
});

class CapturingRabbitMqClient {
  subscription?: {
    deadLetter?: { exchange: string };
    retry?: { exchange: string; maxAttempts: number };
  };
  private consumer?: (message: never) => Promise<unknown>;

  async subscribe(
    subscription: {
      deadLetter?: { exchange: string };
      retry?: { exchange: string; maxAttempts: number };
    },
    consumer: (message: never) => Promise<unknown>,
  ) {
    this.subscription = subscription;
    this.consumer = consumer;
  }

  async consume(message: unknown) {
    if (!this.consumer) {
      throw new Error('Expected handler subscription.');
    }

    return this.consumer(message as never);
  }
}
