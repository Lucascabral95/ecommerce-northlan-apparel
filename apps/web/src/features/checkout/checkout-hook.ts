'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/query-keys';
import { useToastStore } from '../../shared/ui/toast';
import { checkout, syncPaymentStatus } from './checkout-api';

export function useCheckout() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  return useMutation({
    mutationFn: checkout,
    onError: (error) =>
      pushToast(
        error instanceof ApiError
          ? error.message
          : 'Checkout could not start. Review the bag and retry.',
        'error',
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      pushToast('Order created. Payment confirmation is processing.');
    },
  });
}

export function useSyncPaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncPaymentStatus,
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(payment.orderId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}
