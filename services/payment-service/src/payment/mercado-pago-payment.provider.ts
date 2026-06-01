import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentServiceConfigService } from '../config/payment-service.config';
import { mapMercadoPagoStatus } from './payment-status.mapper';
import {
  CreatePaymentPreferenceInput,
  CreatePaymentPreferenceResult,
  GetPaymentStatusInput,
  PaymentProviderAdapter,
  ProviderPaymentStatusResult,
} from './payment-provider.types';

const MERCADO_PAGO_API_BASE_URL = 'https://api.mercadopago.com';

type MercadoPagoPreferenceResponse = Readonly<{
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
}>;

type MercadoPagoPaymentResponse = Readonly<{
  currency_id?: string;
  external_reference?: string;
  id?: number | string;
  status?: string;
  transaction_amount?: number;
}>;

export class MercadoPagoPaymentProvider implements PaymentProviderAdapter {
  readonly provider = 'MERCADO_PAGO' as const;

  constructor(private readonly config: PaymentServiceConfigService) {}

  async createPaymentPreference(
    input: CreatePaymentPreferenceInput,
  ): Promise<CreatePaymentPreferenceResult> {
    const accessToken = this.requireAccessToken();
    const response = await fetch(`${MERCADO_PAGO_API_BASE_URL}/checkout/preferences`, {
      body: JSON.stringify(buildPreferenceBody(input, this.config)),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw createMercadoPagoRequestError(
        'Mercado Pago preference creation failed.',
        response.status,
        await safeReadResponseBody(response),
      );
    }

    const body = (await response.json()) as MercadoPagoPreferenceResponse;
    if (!body.id || (!body.init_point && !body.sandbox_init_point)) {
      throw new ServiceUnavailableException('Mercado Pago preference response is incomplete.');
    }

    return {
      checkoutUrl: body.init_point ?? body.sandbox_init_point,
      externalReference: input.orderId,
      initPoint: body.init_point,
      provider: this.provider,
      providerPreferenceId: body.id,
      rawProviderStatus: 'preference_created',
      sandboxInitPoint: body.sandbox_init_point,
      status: 'PENDING',
    };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<ProviderPaymentStatusResult> {
    const accessToken = this.requireAccessToken();
    const response = await fetch(
      `${MERCADO_PAGO_API_BASE_URL}/v1/payments/${encodeURIComponent(input.providerPaymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    if (!response.ok) {
      throw createMercadoPagoRequestError(
        'Mercado Pago payment status request failed.',
        response.status,
        await safeReadResponseBody(response),
      );
    }

    const body = (await response.json()) as MercadoPagoPaymentResponse;
    const providerPaymentId = body.id?.toString() ?? input.providerPaymentId;

    return {
      amount: body.transaction_amount,
      currency: body.currency_id,
      externalReference: body.external_reference,
      providerPaymentId,
      rawProviderStatus: body.status ?? 'unknown',
      status: mapMercadoPagoStatus(body.status),
    };
  }

  private requireAccessToken(): string {
    const accessToken = this.config.mercadoPagoAccessToken;
    if (!accessToken) {
      throw new BadRequestException('Mercado Pago access token is not configured.');
    }

    return accessToken;
  }
}

function buildPreferenceBody(
  input: CreatePaymentPreferenceInput,
  config: PaymentServiceConfigService,
) {
  const orderQuery = `orderId=${encodeURIComponent(input.orderId)}`;

  return {
    auto_return: 'approved',
    back_urls: {
      failure:
        config.mercadoPagoFailureUrl ??
        `${trimSlash(config.frontendBaseUrl)}/es/payment/failure?${orderQuery}`,
      pending:
        config.mercadoPagoPendingUrl ??
        `${trimSlash(config.frontendBaseUrl)}/es/payment/pending?${orderQuery}`,
      success:
        config.mercadoPagoSuccessUrl ??
        `${trimSlash(config.frontendBaseUrl)}/es/payment/success?${orderQuery}`,
    },
    external_reference: input.orderId,
    items: input.items.map((item) => ({
      currency_id: input.currency,
      quantity: item.quantity,
      title: item.title,
      unit_price: item.unitPrice,
    })),
    metadata: {
      idempotency_key: input.idempotencyKey,
      order_id: input.orderId,
      order_number: input.orderNumber,
      user_id: input.userId,
    },
    notification_url:
      config.mercadoPagoNotificationUrl ??
      config.mercadoPagoWebhookUrl ??
      `${trimSlash(config.apiGatewayBaseUrl)}/payments/mercado-pago/webhook`,
  };
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

async function safeReadResponseBody(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text();
    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}

function createMercadoPagoRequestError(
  baseMessage: string,
  statusCode: number,
  responseBody: string | undefined,
) {
  const message = responseBody ? `${baseMessage} ${responseBody}` : baseMessage;

  if (statusCode >= 400 && statusCode < 500) {
    return new BadRequestException(message);
  }

  return new ServiceUnavailableException(message);
}
