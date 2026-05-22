import Link from 'next/link';

export function Footer() {
  return (
    <footer className="page-shell mt-12 border-t border-[var(--line)] py-10">
      <div className="grid gap-8 md:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="eyebrow">Northlane Apparel</p>
          <p className="display-title mt-4 max-w-2xl text-4xl">
            Apparel for long routes, precise cuts and checkout flows that hold.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-[var(--muted)]">
          <Link href="/products">Products</Link>
          <Link href="/account/profile">Profile</Link>
          <Link href="/cart">Bag</Link>
          <Link href="/account/addresses">Addresses</Link>
          <Link href="/checkout">Checkout</Link>
          <Link href="/account/orders">Orders</Link>
        </div>
      </div>
    </footer>
  );
}
