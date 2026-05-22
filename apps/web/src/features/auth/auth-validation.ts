import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Use a valid email.'),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = loginSchema.extend({
  firstName: z.string().min(2, 'First name is required.').optional().or(z.literal('')),
  lastName: z.string().optional(),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
