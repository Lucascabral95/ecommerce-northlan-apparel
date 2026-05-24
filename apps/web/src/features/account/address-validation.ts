import { z } from 'zod';
import { ARGENTINA_COUNTRY_NAME, ARGENTINA_PROVINCES } from './argentina-locations';

type ValidationKey =
  | 'alias'
  | 'city'
  | 'phone'
  | 'postalCode'
  | 'province'
  | 'recipient'
  | 'street'
  | 'streetNumber';
type ValidationTranslator = (key: ValidationKey) => string;

const fallbackValidationMessages: Record<ValidationKey, string> = {
  alias: 'Alias is required.',
  city: 'City is required.',
  phone: 'Phone is required.',
  postalCode: 'Postal code is required.',
  province: 'Select a valid Argentine province.',
  recipient: 'Recipient is required.',
  street: 'Street is required.',
  streetNumber: 'Street number is required.',
};

export function createAddressSchema(t: ValidationTranslator) {
  return z.object({
    alias: z.string().min(2, t('alias')),
    apartment: z.string().optional(),
    city: z.string().min(2, t('city')),
    country: z.literal(ARGENTINA_COUNTRY_NAME),
    isDefault: z.boolean(),
    phone: z.string().min(5, t('phone')),
    postalCode: z.string().min(2, t('postalCode')),
    province: z.enum(ARGENTINA_PROVINCES, {
      error: t('province'),
    }),
    recipientName: z.string().min(2, t('recipient')),
    references: z.string().optional(),
    street: z.string().min(2, t('street')),
    streetNumber: z.string().min(1, t('streetNumber')),
  });
}

export const addressSchema = createAddressSchema((key) => fallbackValidationMessages[key] ?? key);

export type AddressValues = z.infer<ReturnType<typeof createAddressSchema>>;
