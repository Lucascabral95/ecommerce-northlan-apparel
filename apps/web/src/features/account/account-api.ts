import type { AddressDto, OrderDto, UserProfileDto } from '@northlane/contracts';
import { apiRequest } from '../../shared/api/client';

export type ProfileInput = Readonly<{
  birthDate?: string;
  documentNumber?: string;
  documentType?: string;
  firstName?: string;
  gender?: string;
  lastName?: string;
  phone?: string;
  preferredCategories?: readonly string[];
  preferredSizes?: readonly string[];
}>;

export type AddressInput = Readonly<{
  alias: string;
  apartment?: string;
  city: string;
  country: string;
  isDefault?: boolean;
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  references?: string;
  street: string;
  streetNumber: string;
}>;

export function getProfile(): Promise<UserProfileDto> {
  return apiRequest('/me', { auth: true });
}

export function updateProfile(input: ProfileInput): Promise<UserProfileDto> {
  return apiRequest('/me/profile', {
    auth: true,
    body: JSON.stringify(input),
    method: 'PATCH',
  });
}

export function listAddresses(): Promise<readonly AddressDto[]> {
  return apiRequest('/me/addresses', { auth: true });
}

export function createAddress(input: AddressInput): Promise<AddressDto> {
  return apiRequest('/me/addresses', {
    auth: true,
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export function listOrders(): Promise<readonly OrderDto[]> {
  return apiRequest('/orders', { auth: true });
}

export function getOrder(id: string): Promise<OrderDto> {
  return apiRequest(`/orders/${id}`, { auth: true });
}
