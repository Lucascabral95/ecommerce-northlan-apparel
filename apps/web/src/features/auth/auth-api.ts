import type { AuthResponseDto } from '@northlane/contracts';
import { apiRequest } from '../../shared/api/client';

export type LoginInput = Readonly<{
  email: string;
  password: string;
}>;

export type RegisterInput = LoginInput &
  Readonly<{
    firstName?: string;
    lastName?: string;
  }>;

export type RefreshInput = Readonly<{
  refreshToken: string;
}>;

export function login(input: LoginInput): Promise<AuthResponseDto> {
  return apiRequest('/auth/login', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export function register(input: RegisterInput): Promise<AuthResponseDto> {
  return apiRequest('/auth/register', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export function refreshSession(input: RefreshInput): Promise<AuthResponseDto> {
  return apiRequest('/auth/refresh', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}
