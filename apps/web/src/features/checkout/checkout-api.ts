import type { OrderDto } from '@northlane/contracts';
import { apiRequest } from '../../shared/api/client';

export type CheckoutInput = Readonly<{
  idempotencyKey: string;
  shippingAddressId?: string;
  shippingAddressSnapshot?: Record<string, unknown>;
}>;

export function checkout(input: CheckoutInput): Promise<OrderDto> {
  return apiRequest('/checkout', {
    auth: true,
    body: JSON.stringify(input),
    headers: {
      'idempotency-key': input.idempotencyKey,
    },
    method: 'POST',
  });
}
