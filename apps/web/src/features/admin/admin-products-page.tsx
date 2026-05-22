'use client';

import Link from 'next/link';
import type { ProductDto } from '@northlane/contracts';
import { formatMoney } from '../../shared/format';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorState, LoadingCards } from '../../shared/ui/states';
import { useAdminProducts, useUpdateAdminProduct } from './admin-hooks';

export function AdminProductsPage() {
  const products = useAdminProducts();

  return (
    <div className="grid gap-5">
      <header className="surface grid gap-4 rounded-[2.4rem] p-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="eyebrow">Catalog administration</p>
          <h1 className="display-title mt-4 text-6xl md:text-8xl">Products</h1>
          <p className="mt-4 max-w-2xl text-[var(--muted)]">
            The admin listing includes inactive products so merchandising changes remain auditable.
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--paper-solid)]"
          href="/admin/products/new"
        >
          Create product
        </Link>
      </header>

      {products.isPending ? <LoadingCards count={4} /> : null}
      {products.error ? <ErrorState message={products.error.message} /> : null}
      {products.data?.items.length === 0 ? (
        <EmptyState
          description="Create the first apparel product with variants and gallery media."
          title="Catalog is empty."
        />
      ) : null}
      <div className="grid gap-3">
        {products.data?.items.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function ProductRow({ product }: Readonly<{ product: ProductDto }>) {
  const updateProduct = useUpdateAdminProduct(product.id);
  const availableStock = product.variants.reduce((total, variant) => total + variant.availableStock, 0);

  return (
    <article className="surface grid gap-4 rounded-[1.8rem] p-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{product.title}</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
              product.isActive
                ? 'bg-emerald-950 text-emerald-50'
                : 'border border-[var(--line)] bg-white/40 text-[var(--muted)]'
            }`}
          >
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {product.brand} · {product.categoryName} · {product.skuBase} · {product.variants.length} variants
        </p>
      </div>
      <div className="rounded-[1.3rem] border border-[var(--line)] bg-white/45 px-4 py-3 text-sm">
        <p className="font-semibold">{formatMoney(product.price, product.currency)}</p>
        <p className="mt-1 text-[var(--muted)]">{availableStock} available</p>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Link
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] bg-white/35 px-5 text-sm font-semibold uppercase tracking-[0.08em] transition hover:bg-white/70"
          href={`/admin/products/${product.id}/edit`}
        >
          Edit
        </Link>
        <Button
          disabled={updateProduct.isPending}
          intent="quiet"
          onClick={() => updateProduct.mutate({ isActive: !product.isActive })}
          type="button"
        >
          {product.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </article>
  );
}
