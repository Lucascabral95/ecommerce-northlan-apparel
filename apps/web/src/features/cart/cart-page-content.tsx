'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { formatMoney } from '../../shared/format';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { CartItem } from './cart-item';
import { useCart, useClearCart } from './cart-hooks';

export function CartPageContent() {
  const t = useTranslations('cart');
  const cart = useCart();
  const clearCart = useClearCart();

  return (
    <section className="page-shell">
      <div className="mb-8">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="display-title mt-4 text-6xl md:text-8xl">{t('selected')}</h1>
      </div>
      {cart.error ? <ErrorState message={cart.error.message} /> : null}
      {cart.data?.items.length === 0 ? (
        <EmptyState
          description={t('emptyDescription')}
          title={t('emptyTitle')}
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
            <p className="eyebrow">{t('subtotal')}</p>
            <p className="display-title mt-4 text-5xl">
              {formatMoney(cart.data.subtotal, cart.data.currency)}
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              {t('checkoutPreparation')}
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold uppercase tracking-[0.12em] ![color:#fff]"
              href="/checkout"
            >
              {t('checkout')}
            </Link>
            <Button
              className="mt-3 w-full"
              disabled={clearCart.isPending}
              intent="ghost"
              onClick={() => clearCart.mutate()}
              type="button"
            >
              {t('clear')}
            </Button>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
