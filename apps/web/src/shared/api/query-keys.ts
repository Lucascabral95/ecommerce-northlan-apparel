export const queryKeys = {
  addresses: ['addresses'] as const,
  cart: ['cart'] as const,
  categories: ['categories'] as const,
  order: (id: string) => ['order', id] as const,
  orders: ['orders'] as const,
  products: (filters: Record<string, string | undefined>) => ['products', filters] as const,
  product: (slug: string) => ['product', slug] as const,
  profile: ['profile'] as const,
};
