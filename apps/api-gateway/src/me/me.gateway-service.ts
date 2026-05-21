import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AddressDto,
  CreateAddressCommandPayload,
  EXCHANGE_NAMES,
  ROUTING_KEYS,
  UpdateProfileCommandPayload,
  UserProfileDto,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createGatewayCommandEnvelope } from '../messaging/command-envelope';

type UserRoutingKey =
  | typeof ROUTING_KEYS.userCommandCreateAddress
  | typeof ROUTING_KEYS.userCommandGetProfile
  | typeof ROUTING_KEYS.userCommandListAddresses
  | typeof ROUTING_KEYS.userCommandUpdateProfile;

@Injectable()
export class MeGatewayService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  getProfile(userId: string, correlationId: string): Promise<UserProfileDto> {
    return this.requestUser(ROUTING_KEYS.userCommandGetProfile, { userId }, correlationId);
  }

  updateProfile(payload: UpdateProfileCommandPayload, correlationId: string): Promise<UserProfileDto> {
    return this.requestUser(ROUTING_KEYS.userCommandUpdateProfile, payload, correlationId);
  }

  listAddresses(userId: string, correlationId: string): Promise<readonly AddressDto[]> {
    return this.requestUser(ROUTING_KEYS.userCommandListAddresses, { userId }, correlationId);
  }

  createAddress(payload: CreateAddressCommandPayload, correlationId: string): Promise<AddressDto> {
    return this.requestUser(ROUTING_KEYS.userCommandCreateAddress, payload, correlationId);
  }

  private async requestUser<TResponse, TPayload>(
    routingKey: UserRoutingKey,
    payload: TPayload,
    correlationId: string,
  ): Promise<TResponse> {
    try {
      return await this.rabbitMqClient.request<TResponse>({
        correlationId,
        exchange: EXCHANGE_NAMES.user,
        message: createGatewayCommandEnvelope(routingKey, payload, correlationId),
        routingKey,
      });
    } catch (error) {
      const candidate = error as Error & { code?: unknown };
      if (candidate.code === 'NOT_FOUND') {
        throw new NotFoundException(candidate.message);
      }

      throw candidate instanceof Error ? candidate : new Error('User service request failed.');
    }
  }
}
