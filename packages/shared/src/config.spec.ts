import { describe, expect, it } from 'vitest';
import { parseBooleanEnv, parseEnumEnv, parseIntegerEnv } from './config';

describe('config scalar parsing', () => {
  it('accepts enum values with inline comments', () => {
    expect(
      parseEnumEnv('PAYMENT_PROVIDER', 'MERCADO_PAGO # local demo', ['MOCK', 'MERCADO_PAGO']),
    ).toBe('MERCADO_PAGO');
  });

  it('accepts boolean values with inline comments', () => {
    expect(parseBooleanEnv('FEATURE_ENABLED', 'true # enabled locally')).toBe(true);
  });

  it('accepts integer values with inline comments', () => {
    expect(parseIntegerEnv('ORDER_SERVICE_PORT', '4106 # local port')).toBe(4106);
  });
});
