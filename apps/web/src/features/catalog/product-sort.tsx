'use client';

import { useTranslations } from 'next-intl';
import type { ProductFilters } from './catalog-api';

export function ProductSort({
  filters,
  onChange,
}: Readonly<{
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
}>) {
  const t = useTranslations('products.sort');

  return (
    <label className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
      {t('label')}
      <select
        className="field min-h-11 w-auto pr-10 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        onChange={(event) => onChange({ ...filters, sortBy: event.currentTarget.value })}
        value={filters.sortBy ?? 'newest'}
      >
        <option value="newest">{t('newest')}</option>
        <option value="relevance">{t('relevance')}</option>
        <option value="price_asc">{t('priceAsc')}</option>
        <option value="price_desc">{t('priceDesc')}</option>
      </select>
    </label>
  );
}
