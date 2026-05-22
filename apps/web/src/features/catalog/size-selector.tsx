'use client';

import type { ProductVariantDto } from '@northlane/contracts';

export function SizeSelector({
  onSelect,
  selectedVariant,
  variants,
}: Readonly<{
  onSelect: (variant: ProductVariantDto) => void;
  selectedVariant?: ProductVariantDto;
  variants: readonly ProductVariantDto[];
}>) {
  return (
    <section>
      <p className="eyebrow">Size</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            className={`min-w-14 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              variant.id === selectedVariant?.id
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-solid)]'
                : 'border-[var(--line)] bg-white/45 disabled:opacity-35'
            }`}
            disabled={variant.availableStock <= 0}
            key={variant.id}
            onClick={() => onSelect(variant)}
            type="button"
          >
            {variant.size}
          </button>
        ))}
      </div>
    </section>
  );
}
