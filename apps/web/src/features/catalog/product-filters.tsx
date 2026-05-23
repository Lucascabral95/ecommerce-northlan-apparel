'use client';

import type { CategoryDto, ProductListFiltersDto } from '@northlane/contracts';
import { Button } from '../../shared/ui/button';
import type { ProductFilters } from './catalog-api';

export function ProductFilters({
  categories,
  filters,
  onChange,
  options,
}: Readonly<{
  categories?: readonly CategoryDto[];
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  options?: ProductListFiltersDto;
}>) {
  const catalogCategories = options?.categories ?? categories ?? [];

  return (
    <aside className="surface rounded-[1.8rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Filters</p>
        <Button
          className="min-h-9 px-3 text-[0.65rem] cursor-pointer"
          intent="quiet"
          onClick={() => onChange({ sortBy: filters.sortBy })}
          type="button"
        >
          Reset
        </Button>
      </div>
      <div className="mt-5 grid gap-3">
        <input
          className="field"
          onChange={(event) =>
            onChange({ ...filters, search: event.currentTarget.value || undefined })
          }
          placeholder="Search collection"
          value={filters.search ?? ''}
        />
        <Select
          label="Category"
          onChange={(categorySlug) => onChange({ ...filters, categorySlug })}
          options={catalogCategories.map((category) => ({
            label: category.name,
            value: category.slug,
          }))}
          value={filters.categorySlug}
        />
        <Select
          label="Brand"
          onChange={(brand) => onChange({ ...filters, brand })}
          options={(options?.brands ?? []).map((brand) => ({ label: brand, value: brand }))}
          value={filters.brand}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Size"
            onChange={(size) => onChange({ ...filters, size })}
            options={(options?.sizes ?? []).map((size) => ({ label: size, value: size }))}
            value={filters.size}
          />
          <Select
            label="Color"
            onChange={(color) => onChange({ ...filters, color })}
            options={(options?.colors ?? []).map((color) => ({ label: color, value: color }))}
            value={filters.color}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="field"
            inputMode="decimal"
            onChange={(event) =>
              onChange({ ...filters, minPrice: event.currentTarget.value || undefined })
            }
            placeholder="Min price"
            value={filters.minPrice ?? ''}
          />
          <input
            className="field"
            inputMode="decimal"
            onChange={(event) =>
              onChange({ ...filters, maxPrice: event.currentTarget.value || undefined })
            }
            placeholder="Max price"
            value={filters.maxPrice ?? ''}
          />
        </div>
      </div>
    </aside>
  );
}

function Select({
  label,
  onChange,
  options,
  value,
}: Readonly<{
  label: string;
  onChange: (value: string | undefined) => void;
  options: readonly { label: string; value: string }[];
  value?: string;
}>) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
      {label}
      <select
        className="field text-sm normal-case tracking-normal text-[var(--ink)]"
        onChange={(event) => onChange(event.currentTarget.value || undefined)}
        value={value ?? ''}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
