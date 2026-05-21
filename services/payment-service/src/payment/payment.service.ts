import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  PaymentDto,
  PaymentFailedEventPayload,
  PaymentProvider,
  PaymentSucceededEventPayload,
  RequestPaymentCommandPayload,
  ROUTING_KEYS,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createHash, randomUUID } from 'node:crypto';
import { Payment, PaymentStatus, Prisma, PrismaClient } from '../generated/prisma';
import { PaymentServiceConfigService } from '../config/payment-service.config';
import { PrismaService } from '../prisma/prisma.service';
import { createPaymentMessageEnvelope, MessageContext } from './payment.events';
import { mapPayment } from './payment.mapper';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>;

type PaymentDecision = Readonly<{
  eventRoutingKey:
    | typeof ROUTING_KEYS.paymentEventPaymentFailed
    | typeof ROUTING_KEYS.paymentEventPaymentSucceeded;
  failureReason?: string;
  providerPaymentId?: string;
  status: Extract<PaymentStatus, 'APPROVED' | 'REJECTED'>;
}>;

type ExistingPaymentResult = Readonly<{
  isNewPayment: false;
  payment: Payment;
}>;

type NewPaymentResult = Readonly<{
  eventPayload: PaymentFailedEventPayload | PaymentSucceededEventPayload;
  eventRoutingKey:
    | typeof ROUTING_KEYS.paymentEventPaymentFailed
    | typeof ROUTING_KEYS.paymentEventPaymentSucceeded;
  isNewPayment: true;
  payment: Payment;
}>;

type ProcessPaymentResult = ExistingPaymentResult | NewPaymentResult;

@Injectable()
export class PaymentService {
  constructor(
    private readonly config: PaymentServiceConfigService,
    private readonly prisma: PrismaService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async processPayment(
    payload: RequestPaymentCommandPayload,
    context: MessageContext,
  ): Promise<PaymentDto> {
    this.validateRequest(payload);

    const requestHash = hashPaymentRequest(payload);
    const result = await this.prisma.$transaction<ProcessPaymentResult>(async (tx) => {
      const existingPayment = await tx.payment.findFirst({
        where: {
          OR: [{ idempotencyKey: payload.idempotencyKey }, { orderId: payload.orderId }],
        },
      });

      if (existingPayment) {
        if (
          existingPayment.idempotencyKey !== payload.idempotencyKey ||
          existingPayment.orderId !== payload.orderId ||
          existingPayment.requestHash !== requestHash
        ) {
          throw new ConflictException('Payment idempotency mismatch.');
        }

        return {
          isNewPayment: false,
          payment: existingPayment,
        };
      }

      const decision = decideMockPayment(payload, this.config);
      const payment = await tx.payment.create({
        data: {
          amount: payload.amount,
          currency: payload.currency,
          failureReason: decision.failureReason,
          idempotencyKey: payload.idempotencyKey,
          metadata: toJson(payload.metadata),
          orderId: payload.orderId,
          provider: payload.provider,
          providerPaymentId: decision.providerPaymentId,
          requestHash,
          status: decision.status,
          userId: payload.userId,
        },
      });

      await recordPaymentEvent(tx, payment.id, 'payment.internal.requested', {
        amount: payload.amount,
        currency: payload.currency,
        idempotencyKey: payload.idempotencyKey,
        metadata: payload.metadata ?? {},
        orderId: payload.orderId,
        provider: payload.provider,
        userId: payload.userId,
      });
      const eventPayload = createPaymentEventPayload(payment, decision);
      await recordPaymentEvent(tx, payment.id, decision.eventRoutingKey, eventPayload);

      return {
        eventPayload,
        eventRoutingKey: decision.eventRoutingKey,
        isNewPayment: true,
        payment,
      };
    });

    if (result.isNewPayment) {
      await this.publishPaymentEvent(result.eventRoutingKey, result.eventPayload, context);
    }

    return mapPayment(result.payment);
  }

  private validateRequest(payload: RequestPaymentCommandPayload): void {
    if (payload.provider !== 'MOCK' || this.config.providerMode !== 'MOCK') {
      throw new BadRequestException('Only MOCK payments are supported in the current phase.');
    }

    if (!Number.isFinite(payload.amount) || payload.amount < 0) {
      throw new BadRequestException('Payment amount must be a non-negative number.');
    }

    if (!payload.currency.trim()) {
      throw new BadRequestException('Payment currency is required.');
    }
  }

  private async publishPaymentEvent(
    routingKey:
      | typeof ROUTING_KEYS.paymentEventPaymentFailed
      | typeof ROUTING_KEYS.paymentEventPaymentSucceeded,
    payload: PaymentFailedEventPayload | PaymentSucceededEventPayload,
    context: MessageContext,
  ): Promise<void> {
    await this.rabbitMqClient.publish({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.payment,
      message: createPaymentMessageEnvelope(routingKey, payload, context),
      routingKey,
    });
  }
}

function decideMockPayment(
  payload: RequestPaymentCommandPayload,
  config: PaymentServiceConfigService,
): PaymentDecision {
  const providerPaymentId = `mock_${randomUUID()}`;
  const shouldReject = shouldRejectMockPayment(payload, config);
  if (!shouldReject) {
    return {
      eventRoutingKey: ROUTING_KEYS.paymentEventPaymentSucceeded,
      providerPaymentId,
      status: 'APPROVED',
    };
  }

  const failureReason = shouldReject;
  return {
    eventRoutingKey: ROUTING_KEYS.paymentEventPaymentFailed,
    failureReason,
    status: 'REJECTED',
  };
}

function createPaymentEventPayload(
  payment: Payment,
  decision: PaymentDecision,
): PaymentFailedEventPayload | PaymentSucceededEventPayload {
  const basePayload = {
    amount: Number(payment.amount.toString()),
    currency: payment.currency,
    idempotencyKey: payment.idempotencyKey,
    orderId: payment.orderId,
    paymentId: payment.id,
    provider: payment.provider as PaymentProvider,
    userId: payment.userId,
  };

  if (decision.status === 'APPROVED') {
    return {
      ...basePayload,
      providerPaymentId: requireString(payment.providerPaymentId),
    };
  }

  return {
    ...basePayload,
    failureReason: requireString(decision.failureReason),
  };
}

async function recordPaymentEvent(
  tx: TransactionClient,
  paymentId: string,
  type: string,
  payload: unknown,
): Promise<void> {
  await tx.paymentEvent.create({
    data: {
      paymentId,
      payload: toJson(payload) ?? {},
      type,
    },
  });
}

function shouldRejectMockPayment(
  payload: RequestPaymentCommandPayload,
  config: PaymentServiceConfigService,
): string | undefined {
  if (config.mockForceFailure) {
    return 'Mock payment failure forced by environment.';
  }

  if (sameMoneyAmount(payload.amount, config.mockFailureAmount)) {
    return `Mock payment rejected for configured failure amount ${config.mockFailureAmount}.`;
  }

  const metadata = payload.metadata;
  if (!metadata) {
    return undefined;
  }

  if (metadata.simulateFailure === true || metadata.forceFailure === true) {
    return 'Mock payment failure requested by metadata.';
  }

  if (metadata.mockOutcome === 'REJECTED' || metadata.mockStatus === 'REJECTED') {
    return 'Mock payment rejected by metadata outcome.';
  }

  return undefined;
}

function hashPaymentRequest(payload: RequestPaymentCommandPayload): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        amount: payload.amount,
        currency: payload.currency,
        idempotencyKey: payload.idempotencyKey,
        metadata: payload.metadata ?? {},
        orderId: payload.orderId,
        provider: payload.provider,
        userId: payload.userId,
      }),
    )
    .digest('hex');
}

function sameMoneyAmount(left: number, right: number): boolean {
  return Math.round(left * 100) === Math.round(right * 100);
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function requireString(value: string | null | undefined): string {
  if (!value) {
    throw new Error('Expected payment value to be present.');
  }

  return value;
}
