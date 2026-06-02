import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  PaymentDto,
  ProcessPaymentWebhookCommandPayload,
  ROUTING_KEYS,
  SyncPaymentStatusCommandPayload,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createGatewayCommandEnvelope } from '../messaging/command-envelope';

@Injectable()
export class PaymentsGatewayService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  async syncPaymentStatus(
    payload: SyncPaymentStatusCommandPayload,
    correlationId: string,
  ): Promise<PaymentDto> {
    try {
      return await this.rabbitMqClient.request<PaymentDto>({
        correlationId,
        exchange: EXCHANGE_NAMES.payment,
        message: createGatewayCommandEnvelope(
          ROUTING_KEYS.paymentCommandSyncPaymentStatus,
          payload,
          correlationId,
        ),
        routingKey: ROUTING_KEYS.paymentCommandSyncPaymentStatus,
        timeoutMs: 10_000,
      });
    } catch (error) {
      throw mapPaymentRpcError(error, 'Payment status synchronization failed.');
    }
  }

  async processMercadoPagoWebhook(
    payload: ProcessPaymentWebhookCommandPayload,
    correlationId: string,
  ): Promise<PaymentDto | { ignored: true }> {
    try {
      return await this.rabbitMqClient.request<PaymentDto | { ignored: true }>({
        correlationId,
        exchange: EXCHANGE_NAMES.payment,
        message: createGatewayCommandEnvelope(
          ROUTING_KEYS.paymentCommandProcessWebhook,
          payload,
          correlationId,
        ),
        routingKey: ROUTING_KEYS.paymentCommandProcessWebhook,
        timeoutMs: 10_000,
      });
    } catch (error) {
      throw mapPaymentRpcError(error, 'Payment webhook processing failed.');
    }
  }
}

function mapPaymentRpcError(error: unknown, fallbackMessage: string): Error {
  const candidate = error as Error & { code?: unknown };
  if (candidate.code === 'BAD_REQUEST' || candidate.code === 'UNAUTHORIZED') {
    return new BadRequestException(candidate.message);
  }

  if (candidate.code === 'HTTP_503') {
    return new ServiceUnavailableException(candidate.message);
  }

  return candidate instanceof Error ? candidate : new Error(fallbackMessage);
}
