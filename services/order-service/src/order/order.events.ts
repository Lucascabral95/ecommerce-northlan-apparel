import { MessageEnvelope } from '@northlane/contracts';
import { randomUUID } from 'node:crypto';

export type MessageContext = Readonly<{
  causationId?: string;
  correlationId: string;
}>;

export function createOrderMessageEnvelope<TPayload, TType extends string>(
  type: TType,
  payload: TPayload,
  context: MessageContext,
): MessageEnvelope<TPayload, TType> {
  return {
    causationId: context.causationId,
    correlationId: context.correlationId,
    eventId: randomUUID(),
    payload,
    producer: 'order-service',
    timestamp: new Date().toISOString(),
    type,
    version: 1,
  };
}
