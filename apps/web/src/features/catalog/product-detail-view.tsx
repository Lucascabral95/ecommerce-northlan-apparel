'use client';

import type { ProductDto, ProductVariantDto } from '@northlane/contracts';
import { useState } from 'react';
import { formatMoney } from '../../shared/format';
import { AddToCartButton } from '../cart/add-to-cart-button';
import { VariantSelector } from './variant-selector';

export function ProductDetailView({ product }: Readonly<{ product: ProductDto }>) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantDto | undefined>(
    () =>
      product.variants.find((variant) => variant.isActive && variant.availableStock > 0) ??
      product.variants.find((variant) => variant.isActive),
  );
  const price = selectedVariant?.priceOverride ?? product.price;

  return (
    <aside className="surface sticky top-28 rounded-[2rem] p-6 lg:p-8">
      <p className="eyebrow">
        {product.brand} / {product.categoryName}
      </p>
      <h1 className="display-title mt-5 text-5xl md:text-7xl">{product.title}</h1>
      <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{product.shortDescription}</p>
      <p className="mt-6 text-2xl font-semibold">{formatMoney(price, product.currency)}</p>
      <div className="my-7 h-px bg-[var(--line)]" />
      <VariantSelector
        onSelect={setSelectedVariant}
        selectedVariant={selectedVariant}
        variants={product.variants}
      />
      <div className="mt-7">
        <AddToCartButton
          available={Boolean(selectedVariant && selectedVariant.availableStock > 0)}
          productId={product.id}
          variantId={selectedVariant?.id}
        />
      </div>
      <dl className="mt-8 grid gap-4 border-t border-[var(--line)] pt-6 text-sm">
        <Detail label="Fit" value={product.fit} />
        <Detail label="Material" value={product.material} />
        <Detail label="Composition" value={product.composition} />
        <Detail label="Care" value={product.careInstructions} />
      </dl>
    </aside>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3">
      <dt className="font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</dt>
      <dd className="m-0">{value}</dd>
    </div>
  );
}
