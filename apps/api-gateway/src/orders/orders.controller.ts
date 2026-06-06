import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OrderDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import {
  ApiAuthError,
  ApiGatewayErrors,
  ApiGatewayHeaders,
  ApiJsonResponse,
  ApiResourceNotFound,
} from '../common/swagger/api-docs.decorators';
import { arraySchema, orderSchema } from '../common/swagger/openapi-schemas';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { OrderGatewayService } from './order.gateway-service';

@UseGuards(JwtAuthGuard)
@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiGatewayHeaders()
@ApiGatewayErrors()
@ApiAuthError()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orderGatewayService: OrderGatewayService) {}

  @ApiOperation({ summary: 'List orders for the authenticated user.' })
  @ApiJsonResponse(200, 'Authenticated user order history returned.', arraySchema(orderSchema))
  @Get()
  listOrders(@Req() request: AuthenticatedRequest): Promise<readonly OrderDto[]> {
    return this.orderGatewayService.listOrders(
      { userId: requireUserId(request) },
      getCorrelationId(request),
    );
  }

  @ApiOperation({ summary: 'Get an authenticated user order by id.' })
  @ApiParam({ name: 'id', example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68' })
  @ApiJsonResponse(200, 'Order detail returned.', orderSchema)
  @ApiResourceNotFound('Order was not found for this user.')
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
