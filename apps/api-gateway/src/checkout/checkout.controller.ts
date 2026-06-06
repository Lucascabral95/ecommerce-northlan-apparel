import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CheckoutSessionDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import {
  ApiAuthError,
  ApiGatewayErrors,
  ApiGatewayHeaders,
  ApiJsonResponse,
  ApiValidationError,
} from '../common/swagger/api-docs.decorators';
import { checkoutSessionSchema } from '../common/swagger/openapi-schemas';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CheckoutRequestDto } from '../orders/orders.dto';
import { OrderGatewayService } from '../orders/order.gateway-service';

@UseGuards(JwtAuthGuard)
@ApiTags('Checkout')
@ApiBearerAuth('access-token')
@ApiGatewayHeaders()
@ApiGatewayErrors()
@ApiAuthError()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly orderGatewayService: OrderGatewayService) {}

  @ApiOperation({ summary: 'Start checkout for the authenticated user active cart.' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key. The body idempotencyKey takes precedence.',
  })
  @ApiJsonResponse(200, 'Checkout session returned. Mercado Pago sessions include checkoutUrl.', checkoutSessionSchema)
  @ApiValidationError('Invalid checkout payload or missing idempotency key.')
  @Post()
  createOrder(
    @Body() body: CheckoutRequestDto,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<CheckoutSessionDto> {
    const idempotencyKey = body.idempotencyKey ?? idempotencyKeyHeader;
    if (!idempotencyKey) {
      throw new BadRequestException('Checkout idempotency key is required.');
    }

    return this.orderGatewayService.createCheckoutSession(
      {
        billingAddressSnapshot: body.billingAddressSnapshot,
        idempotencyKey,
        shippingAddressId: body.shippingAddressId,
        shippingAddressSnapshot: body.shippingAddressSnapshot,
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
