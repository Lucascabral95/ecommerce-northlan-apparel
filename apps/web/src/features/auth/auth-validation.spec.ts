import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth-validation';

describe('auth form validation', () => {
  it('accepts login credentials with a valid email', () => {
    expect(
      loginSchema.safeParse({
        email: 'buyer@northlane.test',
        password: 'secret',
      }).success,
    ).toBe(true);
  });

  it('rejects weak register credentials', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      firstName: 'A',
      password: 'short',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining(['email', 'firstName', 'password']),
    );
  });
});
