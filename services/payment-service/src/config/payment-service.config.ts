import { Injectable } from '@nestjs/common';
import {
  parseBooleanEnv,
  parseEnumEnv,
  parseIntegerEnv,
  requireStringEnv,
} from '@northlane/shared';

export type PaymentProviderMode = 'MOCK';

export type PaymentServiceConfig = Readonly<{
  databaseUrl: string;
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
  return {
    databaseUrl: requireStringEnv('PAYMENT_DATABASE_URL', env.PAYMENT_DATABASE_URL),
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
    providerMode: parseEnumEnv(
      'PAYMENT_PROVIDER_MODE',
      env.PAYMENT_PROVIDER_MODE,
      ['MOCK'],
      'MOCK',
    ),
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
