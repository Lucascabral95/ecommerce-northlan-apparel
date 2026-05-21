export const APP_NAME = 'Northlane Apparel';
export const DEFAULT_CURRENCY = 'USD';

export const HTTP_HEADERS = {
  correlationId: 'x-correlation-id',
  idempotencyKey: 'idempotency-key',
} as const;

export const USER_ROLES = {
  admin: 'ADMIN',
  user: 'USER',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
