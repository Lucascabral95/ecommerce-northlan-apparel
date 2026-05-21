import { MessageEnvelope } from '@northlane/contracts';
import { randomUUID } from 'node:crypto';

export function createGatewayCommandEnvelope<TPayload, TType extends string>(
  type: TType,
  payload: TPayload,
  correlationId: string,
): MessageEnvelope<TPayload, TType> {
  return {
    correlationId,
    eventId: randomUUID(),
    payload,
    producer: 'api-gateway',
    timestamp: new Date().toISOString(),
    type,
    version: 1,
  };
}
