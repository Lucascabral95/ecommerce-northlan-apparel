import { randomUUID } from 'node:crypto';
import { PaymentServiceConfigService } from '../config/payment-service.config';
import {
  CreatePaymentPreferenceInput,
  CreatePaymentPreferenceResult,
  GetPaymentStatusInput,
  PaymentProviderAdapter,
  ProviderPaymentStatusResult,
} from './payment-provider.types';

export class MockPaymentProvider implements PaymentProviderAdapter {
  readonly provider = 'MOCK' as const;

  constructor(private readonly config: PaymentServiceConfigService) {}

  async createPaymentPreference(
    input: CreatePaymentPreferenceInput,
  ): Promise<CreatePaymentPreferenceResult> {
    const failureReason = resolveMockFailureReason(input, this.config);

    return {
      externalReference: input.orderId,
      failureReason,
      provider: this.provider,
      providerPaymentId: `mock_${randomUUID()}`,
      rawProviderStatus: failureReason ? 'rejected' : 'approved',
      status: failureReason ? 'REJECTED' : 'APPROVED',
    };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<ProviderPaymentStatusResult> {
    return {
      providerPaymentId: input.providerPaymentId ?? `mock_${input.orderId ?? randomUUID()}`,
      rawProviderStatus: 'approved',
      status: 'APPROVED',
    };
  }
}

function resolveMockFailureReason(
  input: CreatePaymentPreferenceInput,
  config: PaymentServiceConfigService,
): string | undefined {
  if (config.mockForceFailure) {
    return 'Mock payment failure forced by environment.';
  }

  if (sameMoneyAmount(input.amount, config.mockFailureAmount)) {
    return `Mock payment rejected for configured failure amount ${config.mockFailureAmount}.`;
  }

  const metadata = input.metadata;
  if (metadata?.simulateFailure === true || metadata?.forceFailure === true) {
    return 'Mock payment failure requested by metadata.';
  }

  if (metadata?.mockOutcome === 'REJECTED' || metadata?.mockStatus === 'REJECTED') {
    return 'Mock payment rejected by metadata outcome.';
  }

  return undefined;
}

function sameMoneyAmount(left: number, right: number): boolean {
  return Math.round(left * 100) === Math.round(right * 100);
}
