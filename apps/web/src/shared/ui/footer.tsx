import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('footer');
  const common = await getTranslations('common');

  return (
    <footer className="page-shell mt-12 border-t border-[var(--line)] py-10">
      <div className="grid gap-8 md:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="eyebrow">Northlane Apparel</p>
          <p className="display-title mt-4 max-w-2xl text-4xl">
            {t('headline')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-[var(--muted)]">
          <Link href="/products">{common('products')}</Link>
          <Link href="/account/profile">{common('profile')}</Link>
          <Link href="/cart">{common('bag')}</Link>
          <Link href="/account/addresses">{common('addresses')}</Link>
          <Link href="/checkout">{common('checkout')}</Link>
          <Link href="/account/orders">{common('orders')}</Link>
        </div>
      </div>
    </footer>
  );
}
