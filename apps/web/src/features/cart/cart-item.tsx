'use client';

import type { CartItemDto } from '@northlane/contracts';
import Image from 'next/image';
import { formatMoney } from '../../shared/format';
import { useRemoveCartItem, useUpdateCartItem } from './cart-hooks';

export function CartItem({ item }: Readonly<{ item: CartItemDto }>) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  return (
    <article className="grid grid-cols-[5.5rem_1fr] gap-4 border-b border-[var(--line)] py-4">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black/8">
        {item.imageSnapshot ? (
          <Image
            alt={item.titleSnapshot}
            className="object-cover"
            fill
            sizes="90px"
            src={item.imageSnapshot}
          />
        ) : null}
      </div>
      <div>
        <div className="flex justify-between gap-3">
          <div>
            <h3 className="font-semibold">{item.titleSnapshot}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {item.selectedColor} / {item.selectedSize}
            </p>
          </div>
          <p className="font-semibold">{formatMoney(item.total)}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            Qty
            <input
              className="field min-h-9 w-16 px-2 py-1 text-center text-sm text-[var(--ink)]"
              min={1}
              onChange={(event) => {
                const quantity = Number(event.currentTarget.value);
                if (Number.isInteger(quantity) && quantity > 0) {
                  updateItem.mutate({ itemId: item.id, quantity });
                }
              }}
              type="number"
              value={item.quantity}
            />
          </label>
          <button
            className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
            onClick={() => removeItem.mutate(item.id)}
            type="button"
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
