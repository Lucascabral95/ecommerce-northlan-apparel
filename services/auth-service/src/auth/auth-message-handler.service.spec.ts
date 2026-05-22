import { ROUTING_KEYS } from '@northlane/contracts';
import { describe, expect, it } from 'vitest';
import { AuthMessageHandlerService } from './auth-message-handler.service';

describe('AuthMessageHandlerService', () => {
  it('delegates login commands received from RabbitMQ', async () => {
    const authService = {
      login: async (payload: unknown) => ({ payload }),
    };
    const rabbitMqClient = new CapturingRabbitMqClient();
    const handler = new AuthMessageHandlerService(authService as never, rabbitMqClient as never);

    await handler.onModuleInit();
    const response = await rabbitMqClient.consume({
      correlationId: 'correlation-1',
      eventId: 'message-1',
      payload: { email: 'buyer@northlane.test', password: 'secret' },
      type: ROUTING_KEYS.authCommandLogin,
    });

    expect(rabbitMqClient.subscription?.routingKeys).toContain(ROUTING_KEYS.authCommandLogin);
    expect(response).toEqual({
      payload: { email: 'buyer@northlane.test', password: 'secret' },
    });
  });
});

class CapturingRabbitMqClient {
  subscription?: { routingKeys: readonly string[] };
  private consumer?: (message: never) => Promise<unknown>;

  async subscribe(subscription: { routingKeys: readonly string[] }, consumer: (message: never) => Promise<unknown>) {
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
