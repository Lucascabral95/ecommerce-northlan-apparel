import { describe, expect, it } from 'vitest';
import { isFailurePaymentStatus, mapMercadoPagoStatus } from './payment-status.mapper';

describe('payment status mapper', () => {
  it('maps approved Mercado Pago payments to internal success status', () => {
    expect(mapMercadoPagoStatus('approved')).toBe('APPROVED');
  });

  it('maps rejected, cancelled and expired payments as failure statuses', () => {
    expect(isFailurePaymentStatus(mapMercadoPagoStatus('rejected'))).toBe(true);
    expect(isFailurePaymentStatus(mapMercadoPagoStatus('cancelled'))).toBe(true);
    expect(isFailurePaymentStatus(mapMercadoPagoStatus('expired'))).toBe(true);
  });

  it('keeps pending and in_process payments non-terminal for the order saga', () => {
    expect(mapMercadoPagoStatus('pending')).toBe('PENDING');
    expect(mapMercadoPagoStatus('in_process')).toBe('IN_PROCESS');
  });
});
