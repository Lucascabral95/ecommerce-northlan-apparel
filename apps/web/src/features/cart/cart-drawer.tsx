'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '../auth/auth-store';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { formatMoney } from '../../shared/format';
import { useCart } from './cart-hooks';
import { CartItem } from './cart-item';
import { useCartUiStore } from './cart-store';

export function CartDrawer() {
  const t = useTranslations('cart');
  const isOpen = useCartUiStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartUiStore((state) => state.closeDrawer);
  const user = useAuthStore((state) => state.user);
  const cart = useCart();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/32 backdrop-blur-sm" role="dialog">
      <button
        aria-label={t('close')}
        className="absolute inset-0 cursor-default"
        onClick={closeDrawer}
        type="button"
      />
      <aside className="surface absolute right-0 top-0 flex h-full w-[min(34rem,100vw)] flex-col bg-[rgba(248,242,231,.97)] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="eyebrow">{t('eyebrow')}</p>
            <h2 className="display-title mt-3 text-5xl">{t('drawerTitle')}</h2>
          </div>
          <button
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] cursor-pointer"
            onClick={closeDrawer}
            type="button"
          >
            {t('close')}
          </button>
        </div>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          {!user ? (
            <EmptyState
              description="Sign in to keep pieces, quantities and checkout state attached to your account."
              title={t('emptyTitle')}
            />
          ) : null}
          {cart.error ? <ErrorState message={cart.error.message} /> : null}
          {cart.data?.items.length === 0 ? (
            <EmptyState
              description={t('emptyDescription')}
              title={t('emptyTitle')}
            />
          ) : null}
          {cart.data?.items.map((item) => (
            <CartItem item={item} key={item.id} />
          ))}
        </div>
        {cart.data && cart.data.items.length > 0 ? (
          <div className="border-t border-[var(--line)] pt-5">
            <div className="flex justify-between text-lg font-semibold">
              <span>{t('subtotal')}</span>
              <span>{formatMoney(cart.data.subtotal, cart.data.currency)}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] text-sm font-semibold uppercase tracking-[0.08em]"
                href="/cart"
                onClick={closeDrawer}
              >
                {t('viewBag')}
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-6 text-sm font-semibold uppercase tracking-[0.08em] ![color:#fff]"
                href="/checkout"
                onClick={closeDrawer}
              >
                {t('checkout')}
              </Link>
            </div>
          </div>
        ) : (
          <Link className="mt-5" href="/products" onClick={closeDrawer}>
            <Button className="w-full">{t('shopProducts')}</Button>
          </Link>
        )}
      </aside>
    </div>
  );
}
