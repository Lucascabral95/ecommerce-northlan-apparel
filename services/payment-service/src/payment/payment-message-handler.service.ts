import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  QUEUE_NAMES,
  RequestPaymentCommand,
  ROUTING_KEYS,
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
    await this.rabbitMqClient.subscribe<RequestPaymentCommand>(
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
        routingKeys: [ROUTING_KEYS.paymentCommandRequestPayment],
      },
      async (command) => {
        if (command.type !== ROUTING_KEYS.paymentCommandRequestPayment) {
          throw new Error('Unsupported payment command.');
        }

        return this.paymentService.processPayment(command.payload, {
          causationId: command.eventId,
          correlationId: command.correlationId,
        });
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
