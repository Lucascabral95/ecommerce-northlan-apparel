import type { CheckoutSessionDto, PaymentDto } from '@northlane/contracts';
import { apiRequest } from '../../shared/api/client';

export type CheckoutInput = Readonly<{
  idempotencyKey: string;
  shippingAddressId?: string;
  shippingAddressSnapshot?: Record<string, unknown>;
}>;

export type SyncPaymentStatusInput = Readonly<{
  orderId?: string;
  providerPaymentId?: string;
}>;

export function checkout(input: CheckoutInput): Promise<CheckoutSessionDto> {
  return apiRequest('/checkout', {
    auth: true,
    body: JSON.stringify(input),
    headers: {
      'idempotency-key': input.idempotencyKey,
    },
    method: 'POST',
  });
}

export function syncPaymentStatus(input: SyncPaymentStatusInput): Promise<PaymentDto> {
  return apiRequest('/payments/sync-status', {
    auth: true,
    body: JSON.stringify(input),
    method: 'POST',
  });
}
