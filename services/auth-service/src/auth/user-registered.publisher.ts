import { Injectable } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  ROUTING_KEYS,
  UserRegisteredEvent,
  UserRegisteredEventPayload,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { randomUUID } from 'node:crypto';

@Injectable()
export class UserRegisteredPublisher {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  async publish(payload: UserRegisteredEventPayload, correlationId: string, causationId?: string): Promise<void> {
    const event: UserRegisteredEvent = {
      causationId,
      correlationId,
      eventId: randomUUID(),
      payload,
      producer: 'auth-service',
      timestamp: new Date().toISOString(),
      type: ROUTING_KEYS.authEventUserRegistered,
      version: 1,
    };

    await this.rabbitMqClient.publish({
      correlationId,
      exchange: EXCHANGE_NAMES.auth,
      message: event,
      routingKey: ROUTING_KEYS.authEventUserRegistered,
    });
  }
}
