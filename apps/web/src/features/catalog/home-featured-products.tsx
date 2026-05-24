'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ErrorState, LoadingCards } from '../../shared/ui/states';
import { useProducts } from './catalog-hooks';
import { ProductGrid } from './product-grid';

export function HomeFeaturedProducts() {
  const t = useTranslations('home');
  const common = useTranslations('common');
  const featured = useProducts({ isFeatured: 'true', pageSize: '4', sortBy: 'newest' });

  return (
    <section className="page-shell py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t('featured.eyebrow')}</p>
          <h2 className="display-title mt-3 text-5xl md:text-7xl">{t('featured.title')}</h2>
        </div>
        <Link className="text-sm font-bold uppercase tracking-[0.2em]" href="/products">
          {common('products')}
        </Link>
      </div>
      {featured.isLoading ? <LoadingCards /> : null}
      {featured.error ? <ErrorState message={featured.error.message} /> : null}
      {featured.data ? <ProductGrid products={featured.data.items.slice(0, 4)} /> : null}
    </section>
  );
}
