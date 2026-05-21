import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  QUEUE_NAMES,
  RequestPaymentCommand,
  ROUTING_KEYS,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMqClient.subscribe<RequestPaymentCommand>(
      {
        exchange: EXCHANGE_NAMES.payment,
        queue: QUEUE_NAMES.paymentCommands,
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
