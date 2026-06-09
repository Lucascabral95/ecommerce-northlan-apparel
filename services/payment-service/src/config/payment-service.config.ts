import { Injectable } from '@nestjs/common';
import {
  parseBooleanEnv,
  parseEnumEnv,
  parseIntegerEnv,
  requireStringEnv,
} from '@northlane/shared';

export type PaymentProviderMode = 'MERCADO_PAGO' | 'MOCK';

export type PaymentServiceConfig = Readonly<{
  apiGatewayBaseUrl: string;
  databaseUrl: string;
  frontendBaseUrl: string;
  mercadoPagoAccessToken?: string;
  mercadoPagoFailureUrl?: string;
  mercadoPagoHttpDemoMode: boolean;
  mercadoPagoNotificationUrl?: string;
  mercadoPagoPendingUrl?: string;
  mercadoPagoPublicKey?: string;
  mercadoPagoSuccessUrl?: string;
  mercadoPagoWebhookSecret?: string;
  mercadoPagoWebhookUrl?: string;
  mockFailureAmount: number;
  mockForceFailure: boolean;
  port: number;
  providerMode: PaymentProviderMode;
  rabbitMqUrl: string;
  serviceName: 'payment-service';
}>;

@Injectable()
export class PaymentServiceConfigService {
  private readonly config = loadPaymentServiceConfig();

  get mockFailureAmount(): number {
    return this.config.mockFailureAmount;
  }

  get apiGatewayBaseUrl(): string {
    return this.config.apiGatewayBaseUrl;
  }

  get frontendBaseUrl(): string {
    return this.config.frontendBaseUrl;
  }

  get mercadoPagoAccessToken(): string | undefined {
    return this.config.mercadoPagoAccessToken;
  }

  get mercadoPagoFailureUrl(): string | undefined {
    return this.config.mercadoPagoFailureUrl;
  }

  get mercadoPagoHttpDemoMode(): boolean {
    return this.config.mercadoPagoHttpDemoMode;
  }

  get mercadoPagoNotificationUrl(): string | undefined {
    return this.config.mercadoPagoNotificationUrl;
  }

  get mercadoPagoPendingUrl(): string | undefined {
    return this.config.mercadoPagoPendingUrl;
  }

  get mercadoPagoPublicKey(): string | undefined {
    return this.config.mercadoPagoPublicKey;
  }

  get mercadoPagoSuccessUrl(): string | undefined {
    return this.config.mercadoPagoSuccessUrl;
  }

  get mercadoPagoWebhookSecret(): string | undefined {
    return this.config.mercadoPagoWebhookSecret;
  }

  get mercadoPagoWebhookUrl(): string | undefined {
    return this.config.mercadoPagoWebhookUrl;
  }

  get mockForceFailure(): boolean {
    return this.config.mockForceFailure;
  }

  get port(): number {
    return this.config.port;
  }

  get providerMode(): PaymentProviderMode {
    return this.config.providerMode;
  }

  get rabbitMqUrl(): string {
    return this.config.rabbitMqUrl;
  }

  get serviceName(): 'payment-service' {
    return this.config.serviceName;
  }
}

export function loadPaymentServiceConfig(
  env: NodeJS.ProcessEnv = process.env,
): PaymentServiceConfig {
  const providerMode = parseEnumEnv(
    'PAYMENT_PROVIDER',
    env.PAYMENT_PROVIDER ?? env.PAYMENT_PROVIDER_MODE,
    ['MOCK', 'MERCADO_PAGO'],
    'MOCK',
  );
  const apiGatewayBaseUrl =
    optionalStringEnv(env.API_GATEWAY_BASE_URL) ?? 'http://localhost:4000/api/v1';
  const frontendBaseUrl = optionalStringEnv(env.FRONTEND_BASE_URL) ?? 'http://localhost:3000';
  const mercadoPagoAccessToken = optionalStringEnv(env.MERCADO_PAGO_ACCESS_TOKEN);
  const mercadoPagoWebhookSecret = optionalStringEnv(env.MERCADO_PAGO_WEBHOOK_SECRET);

  if (providerMode === 'MERCADO_PAGO' && !mercadoPagoAccessToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN is required when PAYMENT_PROVIDER=MERCADO_PAGO.');
  }

  return {
    apiGatewayBaseUrl,
    databaseUrl: requireStringEnv('PAYMENT_DATABASE_URL', env.PAYMENT_DATABASE_URL),
    frontendBaseUrl,
    mercadoPagoAccessToken,
    mercadoPagoFailureUrl: optionalStringEnv(env.MERCADO_PAGO_FAILURE_URL),
    mercadoPagoHttpDemoMode: parseBooleanEnv(
      'MERCADO_PAGO_HTTP_DEMO_MODE',
      env.MERCADO_PAGO_HTTP_DEMO_MODE,
      false,
    ),
    mercadoPagoNotificationUrl: optionalStringEnv(env.MERCADO_PAGO_NOTIFICATION_URL),
    mercadoPagoPendingUrl: optionalStringEnv(env.MERCADO_PAGO_PENDING_URL),
    mercadoPagoPublicKey: optionalStringEnv(env.MERCADO_PAGO_PUBLIC_KEY),
    mercadoPagoSuccessUrl: optionalStringEnv(env.MERCADO_PAGO_SUCCESS_URL),
    mercadoPagoWebhookSecret,
    mercadoPagoWebhookUrl: optionalStringEnv(env.MERCADO_PAGO_WEBHOOK_URL),
    mockFailureAmount: parseDecimalEnv(
      'PAYMENT_MOCK_FAILURE_AMOUNT',
      env.PAYMENT_MOCK_FAILURE_AMOUNT,
      13.37,
    ),
    mockForceFailure: parseBooleanEnv(
      'PAYMENT_MOCK_FORCE_FAILURE',
      env.PAYMENT_MOCK_FORCE_FAILURE,
      false,
    ),
    port: parseIntegerEnv('PAYMENT_SERVICE_PORT', env.PAYMENT_SERVICE_PORT ?? env.PORT, {
      fallback: 4107,
      max: 65_535,
      min: 1,
    }),
    providerMode,
    rabbitMqUrl: requireStringEnv('RABBITMQ_URL', env.RABBITMQ_URL),
    serviceName: 'payment-service',
  };
}

function parseDecimalEnv(name: string, value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }

  return parsedValue;
}

function optionalStringEnv(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}
