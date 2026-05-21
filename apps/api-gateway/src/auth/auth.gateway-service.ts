import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AuthResponseDto,
  EXCHANGE_NAMES,
  LoginUserCommandPayload,
  RefreshTokenCommandPayload,
  RegisterUserCommandPayload,
  ROUTING_KEYS,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createGatewayCommandEnvelope } from '../messaging/command-envelope';

@Injectable()
export class AuthGatewayService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  async register(payload: RegisterUserCommandPayload, correlationId: string): Promise<AuthResponseDto> {
    return this.requestAuth<AuthResponseDto>(ROUTING_KEYS.authCommandRegister, payload, correlationId);
  }

  async login(payload: LoginUserCommandPayload, correlationId: string): Promise<AuthResponseDto> {
    return this.requestAuth<AuthResponseDto>(ROUTING_KEYS.authCommandLogin, payload, correlationId);
  }

  async refresh(payload: RefreshTokenCommandPayload, correlationId: string): Promise<AuthResponseDto> {
    return this.requestAuth<AuthResponseDto>(ROUTING_KEYS.authCommandRefresh, payload, correlationId);
  }

  private async requestAuth<TResponse, TPayload = unknown>(
    routingKey: typeof ROUTING_KEYS.authCommandLogin | typeof ROUTING_KEYS.authCommandRefresh | typeof ROUTING_KEYS.authCommandRegister,
    payload: TPayload,
    correlationId: string,
  ): Promise<TResponse> {
    try {
      return await this.rabbitMqClient.request<TResponse>({
        correlationId,
        exchange: EXCHANGE_NAMES.auth,
        message: createGatewayCommandEnvelope(routingKey, payload, correlationId),
        routingKey,
      });
    } catch (error) {
      throw mapRpcError(error);
    }
  }
}

function mapRpcError(error: unknown): Error {
  const candidate = error as Error & { code?: unknown };
  if (candidate.code === 'CONFLICT') {
    return new ConflictException(candidate.message);
  }

  if (candidate.code === 'UNAUTHORIZED') {
    return new UnauthorizedException(candidate.message);
  }

  return candidate instanceof Error ? candidate : new Error('Auth service request failed.');
}
