import { z } from 'zod';

type ValidationKey = 'email' | 'firstName' | 'passwordLength' | 'passwordRequired';
type ValidationTranslator = (key: ValidationKey) => string;

const fallbackValidationMessages: Record<ValidationKey, string> = {
  email: 'Use a valid email.',
  firstName: 'First name is required.',
  passwordLength: 'Use at least 8 characters.',
  passwordRequired: 'Password is required.',
};

export function createLoginSchema(t: ValidationTranslator) {
  return z.object({
    email: z.email(t('email')),
    password: z.string().min(1, t('passwordRequired')),
  });
}

export function createRegisterSchema(t: ValidationTranslator) {
  return createLoginSchema(t).extend({
    firstName: z.string().min(2, t('firstName')).optional().or(z.literal('')),
    lastName: z.string().optional(),
    password: z.string().min(8, t('passwordLength')),
  });
}

export const loginSchema = createLoginSchema((key) => fallbackValidationMessages[key] ?? key);
export const registerSchema = createRegisterSchema((key) => fallbackValidationMessages[key] ?? key);

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterValues = z.infer<ReturnType<typeof createRegisterSchema>>;
