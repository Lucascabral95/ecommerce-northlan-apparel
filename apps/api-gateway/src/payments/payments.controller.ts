import { Body, Controller, Headers, Post, Query, Req } from '@nestjs/common';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import { PaymentsGatewayService } from './payments.gateway-service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsGatewayService: PaymentsGatewayService) {}

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

function normalizeHeaders(headers: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}
