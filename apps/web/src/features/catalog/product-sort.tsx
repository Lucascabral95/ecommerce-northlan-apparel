'use client';

import type { ProductFilters } from './catalog-api';

export function ProductSort({
  filters,
  onChange,
}: Readonly<{
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
}>) {
  return (
    <label className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
      Sort
      <select
        className="field min-h-11 w-auto pr-10 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        onChange={(event) => onChange({ ...filters, sortBy: event.currentTarget.value })}
        value={filters.sortBy ?? 'newest'}
      >
        <option value="newest">Newest</option>
        <option value="relevance">Relevance</option>
        <option value="price_asc">Price ascending</option>
        <option value="price_desc">Price descending</option>
      </select>
    </label>
  );
}
