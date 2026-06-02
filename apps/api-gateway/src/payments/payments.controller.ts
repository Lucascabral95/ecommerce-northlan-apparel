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
import { SyncPaymentStatusCommandPayload } from '@northlane/contracts';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { PaymentsGatewayService } from './payments.gateway-service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsGatewayService: PaymentsGatewayService) {}

  @UseGuards(JwtAuthGuard)
  @Post('sync-status')
  syncPaymentStatus(
    @Body() body: Omit<SyncPaymentStatusCommandPayload, 'userId'>,
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
