'use client';

import { useState } from 'react';
import { ErrorState, LoadingCards, EmptyState } from '../../shared/ui/states';
import { useCategories, useProducts } from './catalog-hooks';
import type { ProductFilters } from './catalog-api';
import { ProductFilters as FiltersPanel } from './product-filters';
import { ProductGrid } from './product-grid';
import { ProductSort } from './product-sort';

export function ProductDirectory({
  initialFilters = {},
  title = 'The current edit',
}: Readonly<{ initialFilters?: ProductFilters; title?: string }>) {
  const [filters, setFilters] = useState<ProductFilters>({
    pageSize: '24',
    sortBy: 'newest',
    ...initialFilters,
  });
  const products = useProducts(filters);
  const categories = useCategories();

  return (
    <section className="page-shell">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="display-title mt-4 text-6xl md:text-8xl">{title}</h1>
        </div>
        <ProductSort filters={filters} onChange={setFilters} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
        <FiltersPanel
          categories={categories.data}
          filters={filters}
          onChange={setFilters}
          options={products.data?.filters}
        />
        <div>
          {products.isLoading ? <LoadingCards count={8} /> : null}
          {products.error ? <ErrorState message={products.error.message} /> : null}
          {products.data && products.data.items.length === 0 ? (
            <EmptyState
              description="Change size, color or price filters to widen the collection."
              title="No pieces match this cut."
            />
          ) : null}
          {products.data && products.data.items.length > 0 ? (
            <ProductGrid products={products.data.items} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
