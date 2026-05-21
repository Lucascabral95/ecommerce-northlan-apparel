import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateOrderCommandPayload,
  EXCHANGE_NAMES,
  GetOrderCommandPayload,
  ListOrdersCommandPayload,
  OrderDto,
  ROUTING_KEYS,
  UpdateOrderStatusCommandPayload,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createGatewayCommandEnvelope } from '../messaging/command-envelope';

type OrderRoutingKey =
  | typeof ROUTING_KEYS.orderCommandCreateOrder
  | typeof ROUTING_KEYS.orderCommandGetOrder
  | typeof ROUTING_KEYS.orderCommandListOrders
  | typeof ROUTING_KEYS.orderCommandUpdateStatus;

type OrderCommandPayload =
  | CreateOrderCommandPayload
  | GetOrderCommandPayload
  | ListOrdersCommandPayload
  | UpdateOrderStatusCommandPayload;

@Injectable()
export class OrderGatewayService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  createOrder(payload: CreateOrderCommandPayload, correlationId: string): Promise<OrderDto> {
    return this.requestOrder(ROUTING_KEYS.orderCommandCreateOrder, payload, correlationId);
  }

  listOrders(
    payload: ListOrdersCommandPayload,
    correlationId: string,
  ): Promise<readonly OrderDto[]> {
    return this.requestOrderList(ROUTING_KEYS.orderCommandListOrders, payload, correlationId);
  }

  getOrder(payload: GetOrderCommandPayload, correlationId: string): Promise<OrderDto> {
    return this.requestOrder(ROUTING_KEYS.orderCommandGetOrder, payload, correlationId);
  }

  updateStatus(payload: UpdateOrderStatusCommandPayload, correlationId: string): Promise<OrderDto> {
    return this.requestOrder(ROUTING_KEYS.orderCommandUpdateStatus, payload, correlationId);
  }

  private async requestOrder<TPayload extends OrderCommandPayload>(
    routingKey: OrderRoutingKey,
    payload: TPayload,
    correlationId: string,
  ): Promise<OrderDto> {
    try {
      return await this.rabbitMqClient.request<OrderDto>({
        correlationId,
        exchange: EXCHANGE_NAMES.order,
        message: createGatewayCommandEnvelope(routingKey, payload, correlationId),
        routingKey,
      });
    } catch (error) {
      throw mapRpcError(error);
    }
  }

  private async requestOrderList(
    routingKey: typeof ROUTING_KEYS.orderCommandListOrders,
    payload: ListOrdersCommandPayload,
    correlationId: string,
  ): Promise<readonly OrderDto[]> {
    try {
      return await this.rabbitMqClient.request<readonly OrderDto[]>({
        correlationId,
        exchange: EXCHANGE_NAMES.order,
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
  if (candidate.code === 'BAD_REQUEST') {
    return new BadRequestException(candidate.message);
  }

  if (candidate.code === 'CONFLICT') {
    return new ConflictException(candidate.message);
  }

  if (candidate.code === 'NOT_FOUND') {
    return new NotFoundException(candidate.message);
  }

  return candidate instanceof Error ? candidate : new Error('Order service request failed.');
}
