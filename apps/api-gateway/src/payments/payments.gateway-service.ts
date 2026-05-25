import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  PaymentDto,
  ProcessPaymentWebhookCommandPayload,
  ROUTING_KEYS,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createGatewayCommandEnvelope } from '../messaging/command-envelope';

@Injectable()
export class PaymentsGatewayService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

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
      const candidate = error as Error & { code?: unknown };
      if (candidate.code === 'BAD_REQUEST' || candidate.code === 'UNAUTHORIZED') {
        throw new BadRequestException(candidate.message);
      }

      throw candidate instanceof Error
        ? candidate
        : new Error('Payment webhook processing failed.');
    }
  }
}
