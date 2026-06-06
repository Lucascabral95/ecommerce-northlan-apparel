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
  const successUrl = buildReturnUrl(
    config.mercadoPagoSuccessUrl,
    config.frontendBaseUrl,
    '/es/payment/success',
    orderQuery,
    'MERCADO_PAGO_SUCCESS_URL',
  );
  const failureUrl = buildReturnUrl(
    config.mercadoPagoFailureUrl,
    config.frontendBaseUrl,
    '/es/payment/failure',
    orderQuery,
    'MERCADO_PAGO_FAILURE_URL',
  );
  const pendingUrl = buildReturnUrl(
    config.mercadoPagoPendingUrl,
    config.frontendBaseUrl,
    '/es/payment/pending',
    orderQuery,
    'MERCADO_PAGO_PENDING_URL',
  );

  const notificationUrl = buildNotificationUrl(config);

  return {
    auto_return: 'approved',
    back_urls: {
      failure: failureUrl,
      pending: pendingUrl,
      success: successUrl,
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
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
  };
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildReturnUrl(
  configuredUrl: string | undefined,
  frontendBaseUrl: string,
  path: string,
  query: string,
  label: string,
): string {
  return requireAbsoluteHttpUrl(
    configuredUrl ?? `${trimSlash(frontendBaseUrl)}${path}?${query}`,
    label,
  );
}

function buildNotificationUrl(config: PaymentServiceConfigService): string | undefined {
  if (config.mercadoPagoHttpDemoMode) {
    return undefined;
  }

  return requireAbsoluteHttpUrl(
    config.mercadoPagoNotificationUrl ??
      config.mercadoPagoWebhookUrl ??
      `${trimSlash(config.apiGatewayBaseUrl)}/payments/mercado-pago/webhook`,
    'MERCADO_PAGO_NOTIFICATION_URL',
  );
}

function requireAbsoluteHttpUrl(value: string, label: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    // Fall through to the configuration error below.
  }

  throw new BadRequestException(`${label} must be an absolute http(s) URL for Mercado Pago.`);
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
