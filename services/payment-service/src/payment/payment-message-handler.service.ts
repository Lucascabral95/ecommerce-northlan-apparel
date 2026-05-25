import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  QUEUE_NAMES,
  ProcessPaymentWebhookCommand,
  RequestPaymentCommand,
  ROUTING_KEYS,
  SyncPaymentStatusCommand,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { PaymentService } from './payment.service';

const RETRY_DELAY_MS = 5_000;
const MAX_RETRY_ATTEMPTS = 3;

@Injectable()
export class PaymentMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMqClient.subscribe<
      ProcessPaymentWebhookCommand | RequestPaymentCommand | SyncPaymentStatusCommand
    >(
      {
        deadLetter: paymentDeadLetter(),
        exchange: EXCHANGE_NAMES.payment,
        queue: QUEUE_NAMES.paymentCommands,
        retry: {
          delayMs: RETRY_DELAY_MS,
          exchange: EXCHANGE_NAMES.paymentRetry,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          queue: QUEUE_NAMES.paymentRetry,
          routingKey: 'payment.command.retry',
        },
        routingKeys: [
          ROUTING_KEYS.paymentCommandProcessWebhook,
          ROUTING_KEYS.paymentCommandRequestPayment,
          ROUTING_KEYS.paymentCommandSyncPaymentStatus,
        ],
      },
      async (command) => {
        const context = {
          causationId: command.eventId,
          correlationId: command.correlationId,
        };

        if (command.type === ROUTING_KEYS.paymentCommandRequestPayment) {
          return this.paymentService.processPayment(command.payload, context);
        }

        if (command.type === ROUTING_KEYS.paymentCommandProcessWebhook) {
          return this.paymentService.processWebhook(command.payload, context);
        }

        if (command.type === ROUTING_KEYS.paymentCommandSyncPaymentStatus) {
          return this.paymentService.syncPaymentStatus(command.payload, context);
        }

        throw new Error('Unsupported payment command.');
      },
    );
  }
}

function paymentDeadLetter() {
  return {
    exchange: EXCHANGE_NAMES.paymentDeadLetter,
    queue: QUEUE_NAMES.paymentDeadLetters,
    routingKey: 'payment.command.failed',
  };
}
