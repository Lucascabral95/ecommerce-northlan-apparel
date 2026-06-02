import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  PaymentDto,
  PaymentFailedEventPayload,
  PaymentPendingEventPayload,
  PaymentProvider,
  PaymentSucceededEventPayload,
  PreferenceCreatedEventPayload,
  ProcessPaymentWebhookCommandPayload,
  RequestPaymentCommandPayload,
  ROUTING_KEYS,
  SyncPaymentStatusCommandPayload,
} from '@northlane/contracts';
import {
  RabbitMqClient,
  recordPaymentCreated,
  recordPaymentFailed,
  recordPaymentPending,
  recordPaymentSucceeded,
} from '@northlane/shared';
import { createHash } from 'node:crypto';
import { Payment, PaymentStatus, Prisma, PrismaClient, WebhookEvent } from '../generated/prisma';
import { PaymentServiceConfigService } from '../config/payment-service.config';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoPaymentProvider } from './mercado-pago-payment.provider';
import { validateMercadoPagoWebhookSignature } from './mercado-pago-webhook-signature';
import { MockPaymentProvider } from './mock-payment.provider';
import { createPaymentMessageEnvelope, MessageContext } from './payment.events';
import {
  CreatePaymentPreferenceInput,
  PaymentProviderAdapter,
  ProviderPaymentStatusResult,
} from './payment-provider.types';
import { mapPayment } from './payment.mapper';
import { isFailurePaymentStatus, isTerminalPaymentStatus } from './payment-status.mapper';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>;

type ExistingPaymentResult = Readonly<{
  isNewPayment: false;
  payment: Payment;
}>;

type NewPaymentResult = Readonly<{
  eventPayload:
    | PaymentFailedEventPayload
    | PaymentPendingEventPayload
    | PaymentSucceededEventPayload
    | PreferenceCreatedEventPayload;
  eventRoutingKey: PaymentEventRoutingKey;
  isNewPayment: true;
  payment: Payment;
}>;

type ProcessPaymentResult = ExistingPaymentResult | NewPaymentResult;

type PaymentEventRoutingKey =
  | typeof ROUTING_KEYS.paymentEventPaymentCancelled
  | typeof ROUTING_KEYS.paymentEventPaymentExpired
  | typeof ROUTING_KEYS.paymentEventPaymentFailed
  | typeof ROUTING_KEYS.paymentEventPaymentPending
  | typeof ROUTING_KEYS.paymentEventPaymentRejected
  | typeof ROUTING_KEYS.paymentEventPaymentSucceeded
  | typeof ROUTING_KEYS.paymentEventPreferenceCreated;

@Injectable()
export class PaymentService {
  private readonly mercadoPagoProvider: MercadoPagoPaymentProvider;
  private readonly mockProvider: MockPaymentProvider;

  constructor(
    private readonly config: PaymentServiceConfigService,
    private readonly prisma: PrismaService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {
    this.mockProvider = new MockPaymentProvider(config);
    this.mercadoPagoProvider = new MercadoPagoPaymentProvider(config);
  }

  async processPayment(
    payload: RequestPaymentCommandPayload,
    context: MessageContext,
  ): Promise<PaymentDto> {
    this.validateRequest(payload);

    const provider = this.resolveProvider(payload.provider);
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

      const providerResult = await provider.createPaymentPreference(
        buildProviderPreferenceInput(payload),
      );
      const failureReason =
        providerResult.failureReason ?? resolveFailureReason(providerResult.status);
      const payment = await tx.payment.create({
        data: {
          amount: payload.amount,
          checkoutUrl: providerResult.checkoutUrl,
          currency: payload.currency,
          externalReference: providerResult.externalReference,
          failureReason,
          idempotencyKey: payload.idempotencyKey,
          initPoint: providerResult.initPoint,
          metadata: toJson(payload.metadata),
          orderId: payload.orderId,
          provider: payload.provider,
          providerPaymentId: providerResult.providerPaymentId,
          providerPreferenceId: providerResult.providerPreferenceId,
          rawProviderStatus: providerResult.rawProviderStatus,
          requestHash,
          sandboxInitPoint: providerResult.sandboxInitPoint,
          status: providerResult.status,
          userId: payload.userId,
          ...statusTimestamp(providerResult.status),
        },
      });

      await recordPaymentEvent(tx, payment, 'payment.internal.requested', {
        amount: payload.amount,
        currency: payload.currency,
        idempotencyKey: payload.idempotencyKey,
        metadata: payload.metadata ?? {},
        orderId: payload.orderId,
        provider: payload.provider,
        userId: payload.userId,
      });

      const event = createEventForPayment(payment, failureReason);
      await recordPaymentEvent(tx, payment, event.routingKey, event.payload);

      return {
        eventPayload: event.payload,
        eventRoutingKey: event.routingKey,
        isNewPayment: true,
        payment,
      };
    });

    if (result.isNewPayment) {
      recordPaymentCreatedMetric(result.payment, this.config.serviceName);
      recordPaymentStatusMetric(result.payment, this.config.serviceName);
      await this.publishPaymentEvent(result.eventRoutingKey, result.eventPayload, context);
    }

    return mapPayment(result.payment);
  }

  async processWebhook(
    payload: ProcessPaymentWebhookCommandPayload,
    context: MessageContext,
  ): Promise<PaymentDto | { ignored: true }> {
    const webhookInput = extractWebhookInput(payload);
    validateMercadoPagoWebhookSignature({
      dataId: webhookInput.resourceId,
      requestId: payload.headers['x-request-id'],
      secret: this.config.mercadoPagoWebhookSecret,
      signature: payload.headers['x-signature'],
    });

    await this.publishWebhookEvent(ROUTING_KEYS.paymentEventWebhookReceived, webhookInput, context);

    const existingWebhook = await this.prisma.webhookEvent.findUnique({
      where: { deduplicationKey: webhookInput.deduplicationKey },
    });
    if (existingWebhook?.status === 'PROCESSED' || existingWebhook?.status === 'IGNORED') {
      return { ignored: true };
    }

    const webhookEvent =
      existingWebhook ??
      (await this.prisma.webhookEvent.create({
        data: {
          action: webhookInput.action,
          deduplicationKey: webhookInput.deduplicationKey,
          payload: toJson(payload.body) ?? {},
          provider: 'MERCADO_PAGO',
          providerEventId: webhookInput.providerEventId,
          resourceId: webhookInput.resourceId,
          signature: payload.headers['x-signature'],
          status: 'RECEIVED',
          topic: webhookInput.topic,
        },
      }));

    const paymentId = webhookInput.resourceId;
    if (!paymentId) {
      await this.markWebhookIgnored(webhookEvent);
      return { ignored: true };
    }

    const providerStatus = await this.mercadoPagoProvider.getPaymentStatus({
      providerPaymentId: paymentId,
    });
    const payment = await this.applyProviderStatus(providerStatus, webhookEvent, context);

    await this.publishWebhookEvent(ROUTING_KEYS.paymentEventWebhookProcessed, webhookInput, context);
    return mapPayment(payment);
  }

  async syncPaymentStatus(
    payload: SyncPaymentStatusCommandPayload,
    context: MessageContext,
  ): Promise<PaymentDto> {
    if (!payload.providerPaymentId && !payload.orderId) {
      throw new BadRequestException('providerPaymentId or orderId is required.');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        ...(payload.userId ? { userId: payload.userId } : {}),
        OR: [
          ...(payload.providerPaymentId ? [{ providerPaymentId: payload.providerPaymentId }] : []),
          ...(payload.orderId ? [{ orderId: payload.orderId }] : []),
        ],
      },
    });

    if (!payment) {
      throw new BadRequestException('Payment was not found.');
    }

    const providerPaymentId = payload.providerPaymentId ?? payment.providerPaymentId;
    if (!providerPaymentId) {
      throw new BadRequestException('Payment has no provider payment id to synchronize.');
    }

    const provider = this.resolveProvider(payment.provider as PaymentProvider);
    const providerStatus = await provider.getPaymentStatus({
      orderId: payment.orderId,
      providerPaymentId,
    });

    const updatedPayment = await this.applyProviderStatus(providerStatus, undefined, context);
    return mapPayment(updatedPayment);
  }

  private validateRequest(payload: RequestPaymentCommandPayload): void {
    if (payload.provider !== this.config.providerMode) {
      throw new BadRequestException(
        `Payment provider ${payload.provider} does not match configured provider ${this.config.providerMode}.`,
      );
    }

    if (!Number.isFinite(payload.amount) || payload.amount < 0) {
      throw new BadRequestException('Payment amount must be a non-negative number.');
    }

    if (!payload.currency.trim()) {
      throw new BadRequestException('Payment currency is required.');
    }
  }

  private resolveProvider(provider: PaymentProvider): PaymentProviderAdapter {
    if (provider === 'MOCK') {
      return this.mockProvider;
    }

    if (provider === 'MERCADO_PAGO') {
      return this.mercadoPagoProvider;
    }

    throw new BadRequestException(`Payment provider ${provider} is not supported.`);
  }

  private async applyProviderStatus(
    providerStatus: ProviderPaymentStatusResult,
    webhookEvent: WebhookEvent | undefined,
    context: MessageContext,
  ): Promise<Payment> {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          OR: [
            { providerPaymentId: providerStatus.providerPaymentId },
            ...(providerStatus.externalReference
              ? [{ externalReference: providerStatus.externalReference }]
              : []),
          ],
        },
      });

      if (!payment) {
        if (webhookEvent) {
          await tx.webhookEvent.update({
            data: { status: 'IGNORED' },
            where: { id: webhookEvent.id },
          });
        }
        return { event: undefined, payment: undefined };
      }

      const alreadyTerminal = isTerminalPaymentStatus(payment.status as PaymentStatus);
      const nextStatus = providerStatus.status as PaymentStatus;
      const updatedPayment = await tx.payment.update({
        data: {
          providerPaymentId: providerStatus.providerPaymentId,
          rawProviderStatus: providerStatus.rawProviderStatus,
          status: nextStatus,
          ...statusTimestamp(nextStatus),
        },
        where: { id: payment.id },
      });

      if (webhookEvent) {
        await tx.webhookEvent.update({
          data: {
            paymentId: updatedPayment.id,
            processedAt: new Date(),
            status: 'PROCESSED',
          },
          where: { id: webhookEvent.id },
        });
      }

      await recordPaymentEvent(tx, updatedPayment, `payment.provider.${nextStatus.toLowerCase()}`, {
        providerPaymentId: providerStatus.providerPaymentId,
        rawProviderStatus: providerStatus.rawProviderStatus,
      });

      if (alreadyTerminal && payment.status === nextStatus) {
        return { event: undefined, payment: updatedPayment };
      }

      return {
        event: createEventForPayment(updatedPayment, resolveFailureReason(nextStatus)),
        payment: updatedPayment,
      };
    });

    if (!result.payment) {
      throw new BadRequestException('Payment was not found for webhook resource.');
    }

    if (result.event) {
      recordPaymentStatusMetric(result.payment, this.config.serviceName);
      await this.publishPaymentEvent(result.event.routingKey, result.event.payload, context);
    }

    return result.payment;
  }

  private async publishPaymentEvent(
    routingKey: PaymentEventRoutingKey,
    payload:
      | PaymentFailedEventPayload
      | PaymentPendingEventPayload
      | PaymentSucceededEventPayload
      | PreferenceCreatedEventPayload,
    context: MessageContext,
  ): Promise<void> {
    await this.rabbitMqClient.publish({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.payment,
      message: createPaymentMessageEnvelope(routingKey, payload, context),
      routingKey,
    });
  }

  private async publishWebhookEvent(
    routingKey:
      | typeof ROUTING_KEYS.paymentEventWebhookProcessed
      | typeof ROUTING_KEYS.paymentEventWebhookReceived,
    payload: ReturnType<typeof extractWebhookInput>,
    context: MessageContext,
  ): Promise<void> {
    await this.rabbitMqClient.publish({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.payment,
      message: createPaymentMessageEnvelope(
        routingKey,
        {
          action: payload.action,
          provider: 'MERCADO_PAGO',
          providerEventId: payload.providerEventId,
          resourceId: payload.resourceId,
          topic: payload.topic,
        },
        context,
      ),
      routingKey,
    });
  }

  private async markWebhookIgnored(webhookEvent: WebhookEvent): Promise<void> {
    await this.prisma.webhookEvent.update({
      data: {
        processedAt: new Date(),
        status: 'IGNORED',
      },
      where: { id: webhookEvent.id },
    });
  }
}

function recordPaymentCreatedMetric(payment: Payment, service: string): void {
  recordPaymentCreated({
    provider: payment.provider,
    service,
    status: payment.status,
  });
}

function recordPaymentStatusMetric(payment: Payment, service: string): void {
  const input = {
    provider: payment.provider,
    service,
    status: payment.status,
  };

  if (payment.status === 'APPROVED') {
    recordPaymentSucceeded(input);
    return;
  }

  if (isFailurePaymentStatus(payment.status as PaymentStatus)) {
    recordPaymentFailed(input);
    return;
  }

  recordPaymentPending(input);
}

function buildProviderPreferenceInput(
  payload: RequestPaymentCommandPayload,
): CreatePaymentPreferenceInput {
  return {
    amount: payload.amount,
    currency: payload.currency,
    idempotencyKey: payload.idempotencyKey,
    items:
      payload.items && payload.items.length > 0
        ? payload.items
        : [
            {
              quantity: 1,
              sku: payload.orderNumber ?? payload.orderId,
              title: `Northlane Apparel order ${payload.orderNumber ?? payload.orderId}`,
              unitPrice: payload.amount,
            },
          ],
    metadata: payload.metadata,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    userId: payload.userId,
  };
}

function createEventForPayment(
  payment: Payment,
  failureReason: string | undefined,
): {
  payload:
    | PaymentFailedEventPayload
    | PaymentPendingEventPayload
    | PaymentSucceededEventPayload
    | PreferenceCreatedEventPayload;
  routingKey: PaymentEventRoutingKey;
} {
  const basePayload = {
    amount: Number(payment.amount.toString()),
    currency: payment.currency,
    idempotencyKey: payment.idempotencyKey,
    orderId: payment.orderId,
    paymentId: payment.id,
    provider: payment.provider as PaymentProvider,
    providerPaymentId: payment.providerPaymentId ?? undefined,
    rawProviderStatus: payment.rawProviderStatus ?? undefined,
    userId: payment.userId,
  };

  if (payment.status === 'APPROVED') {
    return {
      payload: {
        ...basePayload,
        providerPaymentId: requireString(payment.providerPaymentId),
      },
      routingKey: ROUTING_KEYS.paymentEventPaymentSucceeded,
    };
  }

  if (isFailurePaymentStatus(payment.status as PaymentStatus)) {
    return {
      payload: {
        ...basePayload,
        failureReason: failureReason ?? `Payment ${payment.status.toLowerCase()}.`,
      },
      routingKey: resolveFailureRoutingKey(payment.status as PaymentStatus),
    };
  }

  if (payment.provider === 'MERCADO_PAGO' && payment.providerPreferenceId && payment.checkoutUrl) {
    return {
      payload: {
        checkoutUrl: payment.checkoutUrl,
        idempotencyKey: payment.idempotencyKey,
        orderId: payment.orderId,
        paymentId: payment.id,
        provider: payment.provider,
        providerPreferenceId: payment.providerPreferenceId,
        userId: payment.userId,
      },
      routingKey: ROUTING_KEYS.paymentEventPreferenceCreated,
    };
  }

  return {
    payload: basePayload,
    routingKey: ROUTING_KEYS.paymentEventPaymentPending,
  };
}

async function recordPaymentEvent(
  tx: TransactionClient,
  payment: Payment,
  type: string,
  payload: unknown,
): Promise<void> {
  await tx.paymentEvent.create({
    data: {
      eventType: type,
      payload: toJson(payload) ?? {},
      paymentId: payment.id,
      processedAt: new Date(),
      provider: payment.provider,
      providerEventId: payment.providerPaymentId,
      type,
    },
  });
}

function extractWebhookInput(payload: ProcessPaymentWebhookCommandPayload) {
  const bodyData = asRecord(payload.body.data);
  const resourceId =
    stringValue(bodyData?.id) ??
    stringValue(payload.body.id) ??
    stringValue(payload.query['data.id']) ??
    stringValue(payload.query.id);
  const topic =
    stringValue(payload.body.type) ??
    stringValue(payload.query.type) ??
    stringValue(payload.query.topic);
  const action = stringValue(payload.body.action) ?? stringValue(payload.query.action);
  const providerEventId =
    stringValue(payload.body.id) ??
    stringValue(payload.headers['x-request-id']) ??
    resourceId;

  return {
    action,
    deduplicationKey: ['MERCADO_PAGO', topic ?? 'payment', action ?? 'event', resourceId ?? providerEventId ?? 'unknown'].join(':'),
    providerEventId,
    resourceId,
    topic,
  };
}

function hashPaymentRequest(payload: RequestPaymentCommandPayload): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        amount: payload.amount,
        currency: payload.currency,
        idempotencyKey: payload.idempotencyKey,
        items: payload.items ?? [],
        metadata: payload.metadata ?? {},
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        provider: payload.provider,
        userId: payload.userId,
      }),
    )
    .digest('hex');
}

function resolveFailureReason(status: PaymentStatus): string | undefined {
  if (status === 'REJECTED') {
    return 'Payment was rejected by the provider.';
  }
  if (status === 'CANCELLED') {
    return 'Payment was cancelled by the provider.';
  }
  if (status === 'EXPIRED') {
    return 'Payment expired before approval.';
  }

  return undefined;
}

function resolveFailureRoutingKey(status: PaymentStatus): PaymentEventRoutingKey {
  if (status === 'CANCELLED') {
    return ROUTING_KEYS.paymentEventPaymentCancelled;
  }
  if (status === 'EXPIRED') {
    return ROUTING_KEYS.paymentEventPaymentExpired;
  }
  return ROUTING_KEYS.paymentEventPaymentFailed;
}

function statusTimestamp(status: PaymentStatus) {
  const now = new Date();
  if (status === 'APPROVED') {
    return { approvedAt: now };
  }
  if (status === 'CANCELLED') {
    return { cancelledAt: now };
  }
  if (status === 'EXPIRED') {
    return { expiredAt: now };
  }
  if (status === 'REJECTED') {
    return { rejectedAt: now };
  }

  return {};
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function requireString(value: string | null | undefined): string {
  if (!value) {
    throw new Error('Expected payment value to be present.');
  }

  return value;
}
