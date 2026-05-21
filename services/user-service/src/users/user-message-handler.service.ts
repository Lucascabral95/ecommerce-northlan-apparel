import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  CreateAddressCommand,
  EXCHANGE_NAMES,
  GetProfileCommand,
  ListAddressesCommand,
  QUEUE_NAMES,
  ROUTING_KEYS,
  UpdateProfileCommand,
  UserRegisteredEvent,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { UsersService } from './users.service';

@Injectable()
export class UserMessageHandlerService implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMqClient.subscribe<UserRegisteredEvent>({
      exchange: EXCHANGE_NAMES.auth,
      queue: QUEUE_NAMES.userEvents,
      routingKeys: [ROUTING_KEYS.authEventUserRegistered],
    }, async (event) => this.usersService.createInitialProfile(event.payload));

    await this.rabbitMqClient.subscribe<
      CreateAddressCommand | GetProfileCommand | ListAddressesCommand | UpdateProfileCommand
    >({
      exchange: EXCHANGE_NAMES.user,
      queue: QUEUE_NAMES.userCommands,
      routingKeys: [
        ROUTING_KEYS.userCommandCreateAddress,
        ROUTING_KEYS.userCommandGetProfile,
        ROUTING_KEYS.userCommandListAddresses,
        ROUTING_KEYS.userCommandUpdateProfile,
      ],
    }, async (command) => {
      if (command.type === ROUTING_KEYS.userCommandGetProfile) {
        return this.usersService.getProfile(command.payload.userId);
      }

      if (command.type === ROUTING_KEYS.userCommandUpdateProfile) {
        return this.usersService.updateProfile(command.payload);
      }

      if (command.type === ROUTING_KEYS.userCommandListAddresses) {
        return this.usersService.listAddresses(command.payload.userId);
      }

      if (command.type === ROUTING_KEYS.userCommandCreateAddress) {
        return this.usersService.createAddress(command.payload);
      }

      throw new Error('Unsupported user command.');
    });
  }
}
