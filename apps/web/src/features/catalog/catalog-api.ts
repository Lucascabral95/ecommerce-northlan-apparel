import type { CategoryDto, ProductDto, ProductListResponseDto } from '@northlane/contracts';
import { apiRequest } from '../../shared/api/client';

export type ProductFilters = Record<string, string | undefined>;

export function listProducts(filters: ProductFilters): Promise<ProductListResponseDto> {
  const search = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return apiRequest(`/products${search.size > 0 ? `?${search.toString()}` : ''}`);
}

export function getProduct(slug: string): Promise<ProductDto> {
  return apiRequest(`/products/${encodeURIComponent(slug)}`);
}

export function listCategories(): Promise<readonly CategoryDto[]> {
  return apiRequest('/categories');
}
