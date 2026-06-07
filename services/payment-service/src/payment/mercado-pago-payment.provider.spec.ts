import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentServiceConfigService } from '../config/payment-service.config';
import { MercadoPagoPaymentProvider } from './mercado-pago-payment.provider';

const fetchMock = vi.fn();

describe('MercadoPagoPaymentProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('omits auto_return, back_urls and notification_url for HTTP ALB demo mode', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'preference-1',
          init_point: 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=preference-1',
        }),
        { status: 201 },
      ),
    );

    const provider = new MercadoPagoPaymentProvider(
      createConfig({
        frontendBaseUrl: 'http://northlane-apparel-dev-alb.example.com',
        mercadoPagoHttpDemoMode: true,
      }),
    );

    await provider.createPaymentPreference(createPreferenceInput());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(payload.auto_return).toBeUndefined();
    expect(payload.back_urls).toBeUndefined();
    expect(payload.notification_url).toBeUndefined();
  });

  it('uses auto_return and notification_url when HTTPS webhook mode is enabled', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'preference-1',
          init_point: 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=preference-1',
        }),
        { status: 201 },
      ),
    );

    const provider = new MercadoPagoPaymentProvider(
      createConfig({
        apiGatewayBaseUrl: 'https://shop.example.com/api/v1',
        frontendBaseUrl: 'https://shop.example.com',
        mercadoPagoHttpDemoMode: false,
      }),
    );

    await provider.createPaymentPreference(createPreferenceInput());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(payload.auto_return).toBe('approved');
    expect(payload.back_urls.success).toBe(
      'https://shop.example.com/es/payment/success?orderId=order-1',
    );
    expect(payload.notification_url).toBe(
      'https://shop.example.com/api/v1/payments/mercado-pago/webhook',
    );
  });

  it('maps Mercado Pago network failures to service unavailable errors', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));

    const provider = new MercadoPagoPaymentProvider(
      createConfig({
        frontendBaseUrl: 'http://northlane-apparel-dev-alb.example.com',
        mercadoPagoHttpDemoMode: true,
      }),
    );

    await expect(provider.createPaymentPreference(createPreferenceInput())).rejects.toMatchObject({
      message: expect.stringContaining('Mercado Pago preference creation failed. fetch failed'),
    });
  });
});

function createPreferenceInput() {
  return {
    amount: 1000,
    currency: 'ARS',
    idempotencyKey: 'idempotency-1',
    items: [
      {
        quantity: 1,
        sku: 'SKU-1',
        title: 'Product',
        unitPrice: 1000,
      },
    ],
    orderId: 'order-1',
    orderNumber: 'ORD-1',
    userId: 'user-1',
  };
}

function createConfig(
  overrides: Partial<PaymentServiceConfigService> = {},
): PaymentServiceConfigService {
  return {
    apiGatewayBaseUrl: 'http://northlane-apparel-dev-alb.example.com/api/v1',
    frontendBaseUrl: 'http://northlane-apparel-dev-alb.example.com',
    mercadoPagoAccessToken: 'access-token',
    mercadoPagoFailureUrl: undefined,
    mercadoPagoHttpDemoMode: false,
    mercadoPagoNotificationUrl: undefined,
    mercadoPagoPendingUrl: undefined,
    mercadoPagoPublicKey: undefined,
    mercadoPagoSuccessUrl: undefined,
    mercadoPagoWebhookSecret: undefined,
    mercadoPagoWebhookUrl: undefined,
    ...overrides,
  } as PaymentServiceConfigService;
}
