import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  LoginUserCommand,
  QUEUE_NAMES,
  RefreshTokenCommand,
  RegisterUserCommand,
  ROUTING_KEYS,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { AuthService } from './auth.service';

@Injectable()
export class AuthMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly authService: AuthService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMqClient.subscribe<RegisterUserCommand | LoginUserCommand | RefreshTokenCommand>({
      exchange: EXCHANGE_NAMES.auth,
      queue: QUEUE_NAMES.authCommands,
      routingKeys: [ROUTING_KEYS.authCommandRegister, ROUTING_KEYS.authCommandLogin, ROUTING_KEYS.authCommandRefresh],
    }, async (command) => {
      if (command.type === ROUTING_KEYS.authCommandRegister) {
        return this.authService.register(command.payload, command.correlationId, command.eventId);
      }

      if (command.type === ROUTING_KEYS.authCommandLogin) {
        return this.authService.login(command.payload);
      }

      if (command.type === ROUTING_KEYS.authCommandRefresh) {
        return this.authService.refresh(command.payload.refreshToken);
      }

      throw new Error('Unsupported auth command.');
    });
  }
}
