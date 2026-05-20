export const CONTRACT_PACKAGE_VERSION = '0.1.0';

export type PlannedMessageEnvelope<TPayload = unknown> = {
  readonly causationId: string;
  readonly correlationId: string;
  readonly eventId: string;
  readonly payload: TPayload;
  readonly producer: string;
  readonly timestamp: string;
  readonly type: string;
  readonly version: number;
};
