import { z } from 'zod';
import { ARGENTINA_COUNTRY_NAME, ARGENTINA_PROVINCES } from './argentina-locations';

export const addressSchema = z.object({
  alias: z.string().min(2, 'Alias is required.'),
  apartment: z.string().optional(),
  city: z.string().min(2, 'City is required.'),
  country: z.literal(ARGENTINA_COUNTRY_NAME),
  isDefault: z.boolean(),
  phone: z.string().min(5, 'Phone is required.'),
  postalCode: z.string().min(2, 'Postal code is required.'),
  province: z.enum(ARGENTINA_PROVINCES, {
    error: 'Select a valid Argentine province.',
  }),
  recipientName: z.string().min(2, 'Recipient is required.'),
  references: z.string().optional(),
  street: z.string().min(2, 'Street is required.'),
  streetNumber: z.string().min(1, 'Street number is required.'),
});

export type AddressValues = z.infer<typeof addressSchema>;
