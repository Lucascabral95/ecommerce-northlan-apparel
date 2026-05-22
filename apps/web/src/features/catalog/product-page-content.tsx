'use client';

import { ErrorState, LoadingCards } from '../../shared/ui/states';
import { useProduct } from './catalog-hooks';
import { ProductDetailView } from './product-detail-view';
import { ProductGallery } from './product-gallery';

export function ProductPageContent({ slug }: Readonly<{ slug: string }>) {
  const product = useProduct(slug);

  if (product.isLoading) {
    return (
      <section className="page-shell">
        <LoadingCards count={2} />
      </section>
    );
  }

  if (product.error) {
    return (
      <section className="page-shell">
        <ErrorState message={product.error.message} />
      </section>
    );
  }

  if (!product.data) {
    return null;
  }

  return (
    <section className="page-shell grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,.85fr)]">
      <ProductGallery images={product.data.images} />
      <ProductDetailView product={product.data} />
    </section>
  );
}
