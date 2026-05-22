import type { CartDto } from '@northlane/contracts';
import { apiRequest } from '../../shared/api/client';

export function getCart(): Promise<CartDto> {
  return apiRequest('/cart', { auth: true });
}

export function addCartItem(
  productId: string,
  variantId: string,
  quantity: number,
): Promise<CartDto> {
  return apiRequest('/cart/items', {
    auth: true,
    body: JSON.stringify({ productId, quantity, variantId }),
    method: 'POST',
  });
}

export function updateCartItem(itemId: string, quantity: number): Promise<CartDto> {
  return apiRequest(`/cart/items/${itemId}`, {
    auth: true,
    body: JSON.stringify({ quantity }),
    method: 'PATCH',
  });
}

export function removeCartItem(itemId: string): Promise<CartDto> {
  return apiRequest(`/cart/items/${itemId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export function clearCart(): Promise<CartDto> {
  return apiRequest('/cart', {
    auth: true,
    method: 'DELETE',
  });
}
