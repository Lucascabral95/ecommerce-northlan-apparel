import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { OrderDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { OrderGatewayService } from './order.gateway-service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orderGatewayService: OrderGatewayService) {}

  @Get()
  listOrders(@Req() request: AuthenticatedRequest): Promise<readonly OrderDto[]> {
    return this.orderGatewayService.listOrders(
      { userId: requireUserId(request) },
      getCorrelationId(request),
    );
  }

  @Get(':id')
  getOrder(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<OrderDto> {
    return this.orderGatewayService.getOrder(
      {
        orderId: id,
        userId: requireUserId(request),
      },
      getCorrelationId(request),
    );
  }
}

function requireUserId(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new Error('Authenticated request is missing user context.');
  }

  return request.user.userId;
}
