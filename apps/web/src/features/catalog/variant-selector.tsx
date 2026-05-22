'use client';

import type { ProductVariantDto } from '@northlane/contracts';
import { ColorSelector } from './color-selector';
import { SizeSelector } from './size-selector';

export function VariantSelector({
  onSelect,
  selectedVariant,
  variants,
}: Readonly<{
  onSelect: (variant: ProductVariantDto) => void;
  selectedVariant?: ProductVariantDto;
  variants: readonly ProductVariantDto[];
}>) {
  const activeVariants = variants.filter((variant) => variant.isActive);
  const colors = uniqueBy(activeVariants, (variant) => variant.colorName);
  const color = selectedVariant?.colorName ?? colors[0]?.colorName;
  const sizes = activeVariants.filter((variant) => variant.colorName === color);

  return (
    <div className="grid gap-6">
      <ColorSelector
        colors={colors}
        onSelect={(nextColor) => {
          const nextVariant = activeVariants.find(
            (variant) => variant.colorName === nextColor.colorName,
          );
          if (nextVariant) {
            onSelect(nextVariant);
          }
        }}
        selectedColor={color}
      />
      <SizeSelector onSelect={onSelect} selectedVariant={selectedVariant} variants={sizes} />
    </div>
  );
}

function uniqueBy<TValue>(values: readonly TValue[], getKey: (value: TValue) => string): TValue[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
