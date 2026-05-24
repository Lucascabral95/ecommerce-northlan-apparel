import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { ProtectedBoundary } from '../../../features/auth/protected-boundary';

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations('common');
  const account = await getTranslations('account');

  return (
    <ProtectedBoundary>
      <section className="page-shell grid gap-5 lg:grid-cols-[15rem_1fr]">
        <nav className="surface h-fit rounded-[1.8rem] p-4 text-sm font-semibold uppercase tracking-[0.16em]">
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account">
            {account('overview')}
          </Link>
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account/profile">
            {t('profile')}
          </Link>
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account/addresses">
            {t('addresses')}
          </Link>
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account/orders">
            {t('orders')}
          </Link>
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account/security">
            {t('security')}
          </Link>
        </nav>
        {children}
      </section>
    </ProtectedBoundary>
  );
}
