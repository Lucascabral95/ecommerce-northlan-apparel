'use client';

import { useState } from 'react';
import { ErrorState, LoadingCards, EmptyState } from '../../shared/ui/states';
import { useCategories, useProducts } from './catalog-hooks';
import type { ProductFilters } from './catalog-api';
import { CatalogPagination } from './catalog-pagination';
import { ProductFilters as FiltersPanel } from './product-filters';
import { ProductGrid } from './product-grid';
import { ProductSort } from './product-sort';

export function ProductDirectory({
  initialFilters = {},
  title = 'Northlane Catalog',
}: Readonly<{ initialFilters?: ProductFilters; title?: string }>) {
  const [filters, setFilters] = useState<ProductFilters>({
    page: '1',
    pageSize: '24',
    sortBy: 'newest',
    ...initialFilters,
  });
  const products = useProducts(filters);
  const categories = useCategories();
  const currentPage = parsePositiveInteger(filters.page, 1);
  const pageSize = parsePositiveInteger(filters.pageSize, 24);

  function updateFilters(nextFilters: ProductFilters) {
    setFilters((currentFilters) => {
      const changedKeys = new Set([
        ...Object.keys(currentFilters),
        ...Object.keys(nextFilters),
      ]);
      const nonPaginationChangeDetected = [...changedKeys].some((key) => {
        if (key === 'page') {
          return false;
        }

        return currentFilters[key] !== nextFilters[key];
      });

      return {
        ...nextFilters,
        page: nonPaginationChangeDetected ? '1' : nextFilters.page ?? currentFilters.page ?? '1',
        pageSize: nextFilters.pageSize ?? currentFilters.pageSize ?? '24',
        sortBy: nextFilters.sortBy ?? currentFilters.sortBy ?? 'newest',
      };
    });
  }

  return (
    <section className="page-shell">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="display-title mt-4 text-6xl md:text-8xl">{title}</h1>
        </div>
        <ProductSort filters={filters} onChange={updateFilters} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
        <FiltersPanel
          categories={categories.data}
          filters={filters}
          onChange={updateFilters}
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
            <>
              <ProductGrid products={products.data.items} />
              <CatalogPagination
                currentPage={currentPage}
                onPageChange={(page) => updateFilters({ ...filters, page: String(page) })}
                pageSize={pageSize}
                totalItems={products.data.total}
              />
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
