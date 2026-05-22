import { describe, expect, it } from 'vitest';
import { addressSchema } from './address-validation';

describe('address form validation', () => {
  it('requires shipping contact and street data', () => {
    const result = addressSchema.safeParse({
      alias: 'H',
      city: '',
      country: 'Argentina',
      isDefault: false,
      phone: '123',
      postalCode: '',
      province: '',
      recipientName: '',
      street: '',
      streetNumber: '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining([
        'alias',
        'city',
        'phone',
        'postalCode',
        'province',
        'recipientName',
        'street',
        'streetNumber',
      ]),
    );
  });
});
