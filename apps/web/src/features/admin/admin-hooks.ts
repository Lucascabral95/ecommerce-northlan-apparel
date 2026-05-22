'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminProductFilters, AdminStockAdjustmentInput } from './admin-api';
import { queryKeys } from '../../shared/api/query-keys';
import { useToastStore } from '../../shared/ui/toast';
import {
  adjustAdminStock,
  createAdminProduct,
  listAdminOrders,
  listAdminProducts,
  updateAdminOrderStatus,
  updateAdminProduct,
} from './admin-api';

export function useAdminProducts(filters: AdminProductFilters = {}) {
  return useQuery({
    queryFn: () => listAdminProducts(filters),
    queryKey: queryKeys.adminProducts(filters),
  });
}

export function useAdminOrders() {
  return useQuery({
    queryFn: listAdminOrders,
    queryKey: queryKeys.adminOrders,
  });
}

export function useCreateAdminProduct() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);

  return useMutation({
    mutationFn: createAdminProduct,
    onError: () => pushToast('Product creation failed.', 'error'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      pushToast('Product created.');
    },
  });
}

export function useUpdateAdminProduct(productId: string) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);

  return useMutation({
    mutationFn: (input: Parameters<typeof updateAdminProduct>[1]) =>
      updateAdminProduct(productId, input),
    onError: () => pushToast('Product update failed.', 'error'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      pushToast('Product saved.');
    },
  });
}

export function useAdjustAdminStock() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);

  return useMutation({
    mutationFn: (input: AdminStockAdjustmentInput) => adjustAdminStock(input),
    onError: () => pushToast('Stock adjustment failed.', 'error'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      pushToast('Stock adjustment accepted by inventory.');
    },
  });
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);

  return useMutation({
    mutationFn: updateAdminOrderStatus,
    onError: () => pushToast('Order status update failed.', 'error'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
      pushToast('Order status updated.');
    },
  });
}
