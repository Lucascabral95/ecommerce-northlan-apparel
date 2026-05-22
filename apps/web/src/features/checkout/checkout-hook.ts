'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../shared/api/query-keys';
import { useToastStore } from '../../shared/ui/toast';
import { checkout } from './checkout-api';

export function useCheckout() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  return useMutation({
    mutationFn: checkout,
    onError: () => pushToast('Checkout could not start. Review the bag and retry.', 'error'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      pushToast('Order created. Payment and stock confirmation are processing.');
    },
  });
}
