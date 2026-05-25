import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateMercadoPagoWebhookSignature } from './mercado-pago-webhook-signature';

describe('validateMercadoPagoWebhookSignature', () => {
  it('accepts a valid Mercado Pago signature', () => {
    const secret = 'test-secret';
    const ts = '1710000000';
    const manifest = 'id:123;request-id:req-1;ts:1710000000;';
    const signature = createHmac('sha256', secret).update(manifest).digest('hex');

    expect(() =>
      validateMercadoPagoWebhookSignature(
        {
          dataId: '123',
          requestId: 'req-1',
          secret,
          signature: `ts=${ts},v1=${signature}`,
        },
        1710000000 * 1000,
      ),
    ).not.toThrow();
  });

  it('rejects an invalid Mercado Pago signature', () => {
    expect(() =>
      validateMercadoPagoWebhookSignature(
        {
          dataId: '123',
          requestId: 'req-1',
          secret: 'test-secret',
          signature: 'ts=1710000000,v1=bad',
        },
        1710000000 * 1000,
      ),
    ).toThrow();
  });
});
