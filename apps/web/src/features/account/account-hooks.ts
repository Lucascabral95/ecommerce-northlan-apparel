'use client';

import type { OrderStatus } from '@northlane/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { queryKeys } from '../../shared/api/query-keys';
import { useToastStore } from '../../shared/ui/toast';
import { syncPaymentStatus } from '../checkout/checkout-api';
import {
  createAddress,
  getOrder,
  getProfile,
  listAddresses,
  listOrders,
  updateProfile,
} from './account-api';

const TERMINAL_ORDER_STATUSES = new Set<OrderStatus>([
  'CANCELLED',
  'CONFIRMED',
  'DELIVERED',
  'FAILED',
  'REFUNDED',
]);
const PENDING_PAYMENT_SYNC_RETRY_MS = 15_000;

export function useProfile() {
  return useQuery({
    queryFn: getProfile,
    queryKey: queryKeys.profile,
  });
}

export function useAddresses() {
  return useQuery({
    queryFn: listAddresses,
    queryKey: queryKeys.addresses,
  });
}

export function useOrders() {
  return useQuery({
    queryFn: listOrders,
    queryKey: queryKeys.orders,
    refetchInterval: (query) => {
      const orders = query.state.data;
      return orders?.some((order) => !TERMINAL_ORDER_STATUSES.has(order.status)) ? 2_000 : false;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    enabled: id.length > 0,
    queryFn: () => getOrder(id),
    queryKey: queryKeys.order(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_ORDER_STATUSES.has(status) ? false : 2_000;
    },
  });
}

export function useSyncPendingPaymentOrders(orderIds: readonly string[] | undefined) {
  const queryClient = useQueryClient();
  const syncAttempts = useRef(new Map<string, number>());

  useEffect(() => {
    const now = Date.now();
    const pendingOrderIds = [...new Set(orderIds ?? [])].filter(
      (orderId) => {
        const lastAttemptAt = syncAttempts.current.get(orderId);
        return (
          orderId.length > 0 &&
          (!lastAttemptAt || now - lastAttemptAt >= PENDING_PAYMENT_SYNC_RETRY_MS)
        );
      },
    );
    if (pendingOrderIds.length === 0) {
      return;
    }

    for (const orderId of pendingOrderIds) {
      syncAttempts.current.set(orderId, now);
      void syncPaymentStatus({ orderId })
        .then((payment) => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
          void queryClient.invalidateQueries({ queryKey: queryKeys.order(payment.orderId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
          window.setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
            void queryClient.invalidateQueries({ queryKey: queryKeys.order(payment.orderId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
          }, 2_500);
        })
        .catch(() => undefined);
    }
  }, [orderIds, queryClient]);
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const t = useTranslations('account.toasts');
  return useMutation({
    mutationFn: updateProfile,
    onError: () => pushToast(t('profileUpdateFailed'), 'error'),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      pushToast(t('profileSaved'));
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const t = useTranslations('account.toasts');
  return useMutation({
    mutationFn: createAddress,
    onError: () => pushToast(t('addressSaveFailed'), 'error'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
      pushToast(t('addressSaved'));
    },
  });
}
