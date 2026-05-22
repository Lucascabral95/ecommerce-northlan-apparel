'use client';

import Link from 'next/link';
import { ErrorState, LoadingCards } from '../../shared/ui/states';
import { useProducts } from './catalog-hooks';
import { ProductGrid } from './product-grid';

export function HomeFeaturedProducts() {
  const featured = useProducts({ isFeatured: 'true', pageSize: '4', sortBy: 'newest' });

  return (
    <section className="page-shell py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Featured</p>
          <h2 className="display-title mt-3 text-5xl md:text-7xl">First picks</h2>
        </div>
        <Link className="text-sm font-bold uppercase tracking-[0.2em]" href="/products">
          Full catalog
        </Link>
      </div>
      {featured.isLoading ? <LoadingCards /> : null}
      {featured.error ? <ErrorState message={featured.error.message} /> : null}
      {featured.data ? <ProductGrid products={featured.data.items.slice(0, 4)} /> : null}
    </section>
  );
}
