import {
  Body,
  Controller,
  Headers,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import {
  ApiAuthError,
  ApiGatewayErrors,
  ApiGatewayHeaders,
  ApiJsonResponse,
} from '../common/swagger/api-docs.decorators';
import { acceptedCommandSchema } from '../common/swagger/openapi-schemas';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { SyncPaymentStatusRequestDto } from './payments.dto';
import { PaymentsGatewayService } from './payments.gateway-service';

@ApiTags('Payments')
@ApiGatewayHeaders()
@ApiGatewayErrors()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsGatewayService: PaymentsGatewayService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Synchronize payment status with the configured payment provider.',
    description:
      'Used by payment return pages to ask Payment Service to query the provider before updating orders.',
  })
  @ApiJsonResponse(200, 'Payment synchronization command completed.', acceptedCommandSchema)
  @ApiAuthError()
  @UseGuards(JwtAuthGuard)
  @Post('sync-status')
  syncPaymentStatus(
    @Body() body: SyncPaymentStatusRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.paymentsGatewayService.syncPaymentStatus(
      {
        orderId: body.orderId,
        providerPaymentId: body.providerPaymentId,
        userId: requireUserId(request),
      },
      getCorrelationId(request),
    );
  }

  @ApiOperation({
    summary: 'Mercado Pago webhook entrypoint.',
    description:
      'Public endpoint called by Mercado Pago. The gateway delegates processing to Payment Service through RabbitMQ.',
  })
  @ApiHeader({
    name: 'x-signature',
    required: false,
    description: 'Mercado Pago signature header when webhook signature validation is enabled.',
  })
  @ApiHeader({
    name: 'x-request-id',
    required: false,
    description: 'Mercado Pago webhook request id header.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Mercado Pago webhook topic, for example payment.',
  })
  @ApiQuery({
    name: 'data.id',
    required: false,
    description: 'Mercado Pago resource identifier when sent as query parameter.',
  })
  @ApiBody({
    description: 'Raw Mercado Pago webhook payload.',
    schema: {
      additionalProperties: true,
      example: {
        action: 'payment.updated',
        data: { id: '1234567890' },
        type: 'payment',
      },
      type: 'object',
    },
  })
  @ApiAcceptedResponse({
    description: 'Webhook accepted for internal processing.',
    schema: acceptedCommandSchema,
  })
  @Post('mercado-pago/webhook')
  processMercadoPagoWebhook(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | undefined>,
    @Query() query: Record<string, string | undefined>,
    @Req() request: CorrelatedRequest,
  ) {
    return this.paymentsGatewayService.processMercadoPagoWebhook(
      {
        body,
        headers: normalizeHeaders(headers),
        query,
      },
      getCorrelationId(request),
    );
  }
}

function requireUserId(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new UnauthorizedException('Authenticated request is missing user context.');
  }

  return request.user.userId;
}

function normalizeHeaders(headers: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}
