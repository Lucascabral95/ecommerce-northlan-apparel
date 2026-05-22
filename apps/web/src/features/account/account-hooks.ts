'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../shared/api/query-keys';
import { useToastStore } from '../../shared/ui/toast';
import {
  createAddress,
  getOrder,
  getProfile,
  listAddresses,
  listOrders,
  updateProfile,
} from './account-api';

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
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryFn: () => getOrder(id),
    queryKey: queryKeys.order(id),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  return useMutation({
    mutationFn: updateProfile,
    onError: () => pushToast('Profile update failed.', 'error'),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      pushToast('Profile saved.');
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  return useMutation({
    mutationFn: createAddress,
    onError: () => pushToast('Address could not be saved.', 'error'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
      pushToast('Address saved.');
    },
  });
}
