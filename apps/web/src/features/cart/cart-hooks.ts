'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartDto } from '@northlane/contracts';
import { queryKeys } from '../../shared/api/query-keys';
import { useToastStore } from '../../shared/ui/toast';
import { useAuthStore } from '../auth/auth-store';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from './cart-api';

export function useCart() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    enabled: Boolean(user),
    queryFn: getCart,
    queryKey: queryKeys.cart,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  return useMutation({
    mutationFn: (input: { productId: string; quantity: number; variantId: string }) =>
      addCartItem(input.productId, input.variantId, input.quantity),
    onError: () => pushToast('Sign in and try adding that piece again.', 'error'),
    onSuccess: (cart) => {
      setCart(queryClient, cart);
      pushToast('Added to your bag.');
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  return useMutation({
    mutationFn: (input: { itemId: string; quantity: number }) =>
      updateCartItem(input.itemId, input.quantity),
    onError: () => pushToast('Quantity update failed.', 'error'),
    onSuccess: (cart) => setCart(queryClient, cart),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  return useMutation({
    mutationFn: removeCartItem,
    onError: () => pushToast('The item could not be removed.', 'error'),
    onSuccess: (cart) => {
      setCart(queryClient, cart);
      pushToast('Removed from bag.');
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCart,
    onSuccess: (cart) => setCart(queryClient, cart),
  });
}

function setCart(queryClient: ReturnType<typeof useQueryClient>, cart: CartDto): void {
  queryClient.setQueryData(queryKeys.cart, cart);
}
