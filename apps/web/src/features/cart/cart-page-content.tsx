'use client';

import Link from 'next/link';
import { formatMoney } from '../../shared/format';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { CartItem } from './cart-item';
import { useCart, useClearCart } from './cart-hooks';

export function CartPageContent() {
  const cart = useCart();
  const clearCart = useClearCart();

  return (
    <section className="page-shell">
      <div className="mb-8">
        <p className="eyebrow">Bag</p>
        <h1 className="display-title mt-4 text-6xl md:text-8xl">Selected pieces</h1>
      </div>
      {cart.error ? <ErrorState message={cart.error.message} /> : null}
      {cart.data?.items.length === 0 ? (
        <EmptyState
          description="Select a size and color from a product page to build checkout."
          title="Nothing in the bag yet."
        />
      ) : null}
      {cart.data && cart.data.items.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
          <div className="surface rounded-[2rem] px-5 py-2">
            {cart.data.items.map((item) => (
              <CartItem item={item} key={item.id} />
            ))}
          </div>
          <aside className="surface h-fit rounded-[2rem] p-6">
            <p className="eyebrow">Subtotal</p>
            <p className="display-title mt-4 text-5xl">
              {formatMoney(cart.data.subtotal, cart.data.currency)}
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Shipping and tax snapshots are prepared during the checkout flow.
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold uppercase tracking-[0.12em] text-[var(--paper-solid)]"
              href="/checkout"
            >
              Checkout
            </Link>
            <Button
              className="mt-3 w-full"
              disabled={clearCart.isPending}
              intent="ghost"
              onClick={() => clearCart.mutate()}
              type="button"
            >
              Clear bag
            </Button>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
