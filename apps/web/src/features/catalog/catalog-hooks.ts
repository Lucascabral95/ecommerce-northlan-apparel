'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../shared/api/query-keys';
import { getProduct, listCategories, listProducts, type ProductFilters } from './catalog-api';

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryFn: () => listProducts(filters),
    queryKey: queryKeys.products(filters),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryFn: () => getProduct(slug),
    queryKey: queryKeys.product(slug),
  });
}

export function useCategories() {
  return useQuery({
    queryFn: listCategories,
    queryKey: queryKeys.categories,
  });
}
