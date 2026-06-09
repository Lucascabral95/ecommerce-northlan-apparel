import { PaymentPreferenceItemPayload, PaymentProvider, PaymentStatus } from '@northlane/contracts';

export type CreatePaymentPreferenceInput = Readonly<{
  amount: number;
  currency: string;
  idempotencyKey: string;
  items: readonly PaymentPreferenceItemPayload[];
  metadata?: Record<string, unknown>;
  orderId: string;
  orderNumber?: string;
  userId: string;
}>;

export type CreatePaymentPreferenceResult = Readonly<{
  checkoutUrl?: string;
  expiresAt?: Date;
  externalReference: string;
  failureReason?: string;
  initPoint?: string;
  provider: PaymentProvider;
  providerPaymentId?: string;
  providerPreferenceId?: string;
  rawProviderStatus?: string;
  sandboxInitPoint?: string;
  status: PaymentStatus;
}>;

export type GetPaymentStatusInput = Readonly<{
  orderId?: string;
  providerPaymentId?: string;
}>;

export type ProviderPaymentStatusResult = Readonly<{
  amount?: number;
  currency?: string;
  externalReference?: string;
  providerPaymentId: string;
  rawProviderStatus: string;
  status: PaymentStatus;
}>;

export type PaymentProviderAdapter = Readonly<{
  createPaymentPreference(input: CreatePaymentPreferenceInput): Promise<CreatePaymentPreferenceResult>;
  getPaymentStatus(input: GetPaymentStatusInput): Promise<ProviderPaymentStatusResult>;
  provider: PaymentProvider;
}>;
