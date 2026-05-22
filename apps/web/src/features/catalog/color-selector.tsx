'use client';

import type { ProductVariantDto } from '@northlane/contracts';

export function ColorSelector({
  colors,
  onSelect,
  selectedColor,
}: Readonly<{
  colors: readonly ProductVariantDto[];
  onSelect: (variant: ProductVariantDto) => void;
  selectedColor?: string;
}>) {
  return (
    <section>
      <p className="eyebrow">Color</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {colors.map((variant) => (
          <button
            aria-label={`Select ${variant.colorName}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
              variant.colorName === selectedColor
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-solid)]'
                : 'border-[var(--line)] bg-white/45'
            }`}
            key={variant.colorName}
            onClick={() => onSelect(variant)}
            type="button"
          >
            <span
              className="h-4 w-4 rounded-full border border-white/50"
              style={{ backgroundColor: variant.colorHex }}
            />
            {variant.colorName}
          </button>
        ))}
      </div>
    </section>
  );
}
