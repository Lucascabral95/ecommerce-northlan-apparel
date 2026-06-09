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

type MercadoPagoPaymentSearchResponse = Readonly<{
  results?: readonly MercadoPagoPaymentResponse[];
}>;

export class MercadoPagoPaymentProvider implements PaymentProviderAdapter {
  readonly provider = 'MERCADO_PAGO' as const;

  constructor(private readonly config: PaymentServiceConfigService) {}

  async createPaymentPreference(
    input: CreatePaymentPreferenceInput,
  ): Promise<CreatePaymentPreferenceResult> {
    const accessToken = this.requireAccessToken();
    const response = await fetchMercadoPago(
      `${MERCADO_PAGO_API_BASE_URL}/checkout/preferences`,
      {
        body: JSON.stringify(buildPreferenceBody(input, this.config)),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': input.idempotencyKey,
        },
        method: 'POST',
      },
      'Mercado Pago preference creation failed.',
    );

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
    const body = input.providerPaymentId
      ? await fetchMercadoPagoPaymentById(input.providerPaymentId, accessToken)
      : await fetchLatestMercadoPagoPaymentByOrderId(input.orderId, accessToken);

    const providerPaymentId = body.id?.toString() ?? input.providerPaymentId;
    if (!providerPaymentId) {
      throw new ServiceUnavailableException('Mercado Pago payment status response is incomplete.');
    }

    return {
      amount: body.transaction_amount,
      currency: body.currency_id,
      externalReference: body.external_reference ?? input.orderId,
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

async function fetchMercadoPagoPaymentById(
  providerPaymentId: string,
  accessToken: string,
): Promise<MercadoPagoPaymentResponse> {
  const response = await fetchMercadoPago(
    `${MERCADO_PAGO_API_BASE_URL}/v1/payments/${encodeURIComponent(providerPaymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    },
    'Mercado Pago payment status request failed.',
  );

  if (!response.ok) {
    throw createMercadoPagoRequestError(
      'Mercado Pago payment status request failed.',
      response.status,
      await safeReadResponseBody(response),
    );
  }

  return (await response.json()) as MercadoPagoPaymentResponse;
}

async function fetchLatestMercadoPagoPaymentByOrderId(
  orderId: string | undefined,
  accessToken: string,
): Promise<MercadoPagoPaymentResponse> {
  if (!orderId) {
    throw new BadRequestException(
      'orderId or providerPaymentId is required to synchronize payment status.',
    );
  }

  const searchParams = new URLSearchParams({
    criteria: 'desc',
    external_reference: orderId,
    limit: '1',
    sort: 'date_created',
  });
  const response = await fetchMercadoPago(
    `${MERCADO_PAGO_API_BASE_URL}/v1/payments/search?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    },
    'Mercado Pago payment search request failed.',
  );

  if (!response.ok) {
    throw createMercadoPagoRequestError(
      'Mercado Pago payment search request failed.',
      response.status,
      await safeReadResponseBody(response),
    );
  }

  const body = (await response.json()) as MercadoPagoPaymentSearchResponse;
  const latestPayment = body.results?.[0];
  if (!latestPayment) {
    throw new BadRequestException(`Mercado Pago payment was not found for order ${orderId}.`);
  }

  return latestPayment;
}

function buildPreferenceBody(
  input: CreatePaymentPreferenceInput,
  config: PaymentServiceConfigService,
) {
  const notificationUrl = buildNotificationUrl(config);

  return {
    ...(config.mercadoPagoHttpDemoMode ? {} : { auto_return: 'approved' }),
    back_urls: buildBackUrls(input, config),
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

function buildBackUrls(
  input: CreatePaymentPreferenceInput,
  config: PaymentServiceConfigService,
) {
  const orderQuery = `orderId=${encodeURIComponent(input.orderId)}`;

  return {
    failure: buildReturnUrl(
      config.mercadoPagoFailureUrl,
      config.frontendBaseUrl,
      '/es/payment/failure',
      orderQuery,
      'MERCADO_PAGO_FAILURE_URL',
    ),
    pending: buildReturnUrl(
      config.mercadoPagoPendingUrl,
      config.frontendBaseUrl,
      '/es/payment/pending',
      orderQuery,
      'MERCADO_PAGO_PENDING_URL',
    ),
    success: buildReturnUrl(
      config.mercadoPagoSuccessUrl,
      config.frontendBaseUrl,
      '/es/payment/success',
      orderQuery,
      'MERCADO_PAGO_SUCCESS_URL',
    ),
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

async function fetchMercadoPago(
  url: string,
  init: RequestInit,
  failureMessage: string,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new ServiceUnavailableException(`${failureMessage} ${getNetworkErrorMessage(error)}`);
  }
}

function getNetworkErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Mercado Pago API is unreachable.';
}
