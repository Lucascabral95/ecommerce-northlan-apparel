import type {
  AdjustStockMode,
  CreateProductCommandPayload,
  InventoryItemDto,
  OrderDto,
  OrderStatus,
  ProductDto,
  ProductListResponseDto,
  UpdateProductCommandPayload,
} from '@northlane/contracts';
import { apiRequest } from '../../shared/api/client';

export type AdminProductInput = Omit<CreateProductCommandPayload, 'images' | 'variants'> &
  Pick<CreateProductCommandPayload, 'images' | 'variants'>;

export type AdminProductUpdateInput = Omit<UpdateProductCommandPayload, 'id'>;

export type AdminProductFilters = Record<string, string | undefined>;

export type AdminOrderStatusInput = Readonly<{
  orderId: string;
  reason?: string;
  status: OrderStatus;
}>;

export type AdminStockAdjustmentInput = Readonly<{
  idempotencyKey?: string;
  mode: AdjustStockMode;
  productId: string;
  quantity: number;
  reason?: string;
  sku: string;
  variantId: string;
}>;

export function listAdminProducts(
  filters: AdminProductFilters = {},
): Promise<ProductListResponseDto> {
  const search = new URLSearchParams(
    Object.entries({
      pageSize: '100',
      ...filters,
    }).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  return apiRequest(`/admin/products?${search.toString()}`, { auth: true });
}

export function createAdminProduct(input: AdminProductInput): Promise<ProductDto> {
  return apiRequest('/admin/products', {
    auth: true,
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export function updateAdminProduct(
  productId: string,
  input: AdminProductUpdateInput,
): Promise<ProductDto> {
  return apiRequest(`/admin/products/${productId}`, {
    auth: true,
    body: JSON.stringify(input),
    method: 'PATCH',
  });
}

export function adjustAdminStock(input: AdminStockAdjustmentInput): Promise<InventoryItemDto> {
  const { productId, ...body } = input;
  return apiRequest(`/admin/products/${productId}/stock`, {
    auth: true,
    body: JSON.stringify(body),
    method: 'PATCH',
  });
}

export function listAdminOrders(): Promise<readonly OrderDto[]> {
  return apiRequest('/admin/orders', { auth: true });
}

export function updateAdminOrderStatus(input: AdminOrderStatusInput): Promise<OrderDto> {
  const { orderId, ...body } = input;
  return apiRequest(`/admin/orders/${orderId}/status`, {
    auth: true,
    body: JSON.stringify(body),
    method: 'PATCH',
  });
}
