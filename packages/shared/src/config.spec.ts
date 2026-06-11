import { describe, expect, it } from 'vitest';
import { parseBooleanEnv, parseEnumEnv, parseIntegerEnv } from './config';

describe('config env parsing', () => {
  it('ignores inline comments in typed env values', () => {
    expect(parseEnumEnv('PAYMENT_PROVIDER', 'MERCADO_PAGO # local note', ['MOCK', 'MERCADO_PAGO'])).toBe(
      'MERCADO_PAGO',
    );
    expect(parseBooleanEnv('FEATURE_FLAG', 'false # disabled locally')).toBe(false);
    expect(parseIntegerEnv('PORT', '4107 # payment service')).toBe(4107);
  });
});
