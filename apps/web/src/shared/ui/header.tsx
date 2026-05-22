'use client';

import Link from 'next/link';
import { useCart } from '../../features/cart/cart-hooks';
import { CartDrawer } from '../../features/cart/cart-drawer';
import { useCartUiStore } from '../../features/cart/cart-store';
import { useAuthStore } from '../../features/auth/auth-store';

export function Header() {
  const openDrawer = useCartUiStore((state) => state.openDrawer);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const cart = useCart();
  const cartCount = cart.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(246,240,230,.76)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 md:px-10">
          <Link className="group" href="/">
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.42em] text-[var(--muted)]">
              Northlane
            </span>
            <span className="display-title block text-3xl transition group-hover:text-[var(--accent)]">
              Apparel
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold uppercase tracking-[0.16em] md:flex">
            <Link href="/products">Shop</Link>
            <Link href="/categories/remeras">Categories</Link>
            <Link href="/account/orders">Orders</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  className="hidden rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] sm:block"
                  href="/account"
                >
                  Account
                </Link>
                <button
                  className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] lg:block"
                  onClick={clearSession}
                  type="button"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                href="/login"
              >
                Login
              </Link>
            )}
            <button
              aria-label="Open bag"
              className="relative rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--paper-solid)]"
              onClick={openDrawer}
              type="button"
            >
              Bag {cartCount > 0 ? `(${cartCount})` : ''}
            </button>
          </div>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
