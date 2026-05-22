import type { ProductDto } from '@northlane/contracts';
import { ProductCard } from './product-card';

export function ProductGrid({ products }: Readonly<{ products: readonly ProductDto[] }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
