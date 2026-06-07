'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAddresses, useOrders, useProfile } from './account-hooks';

export function AccountOverview() {
  const t = useTranslations('account.overviewPage');
  const profile = useProfile();
  const addresses = useAddresses();
  const orders = useOrders();

  return (
    <div>
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1 className="display-title mt-4 text-6xl md:text-8xl">
        {profile.data?.firstName ? t('namedTitle', { name: profile.data.firstName }) : t('title')}
      </h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Summary label={t('orders')} value={(orders.data?.length ?? 0).toString()} />
        <Summary label={t('addresses')} value={(addresses.data?.length ?? 0).toString()} />
        <Summary label={t('email')} value={profile.data?.email ?? t('loading')} />
      </div>
      <div className="surface mt-5 flex flex-wrap gap-3 rounded-[2rem] p-6">
        <AccountLink href="/account/profile">{t('editProfile')}</AccountLink>
        <AccountLink href="/account/addresses">{t('addAddress')}</AccountLink>
        <AccountLink href="/account/orders">{t('viewOrders')}</AccountLink>
      </div>
    </div>
  );
}

function Summary({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <article className="surface rounded-[1.8rem] p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-5 truncate text-2xl font-semibold">{value}</p>
    </article>
  );
}

function AccountLink({
  children,
  href,
}: Readonly<{
  children: React.ReactNode;
  href: '/account/addresses' | '/account/orders' | '/account/profile';
}>) {
  return (
    <Link
      className="rounded-full border border-[var(--line)] bg-white/40 px-5 py-3 text-sm font-bold uppercase tracking-[0.14em]"
      href={href}
    >
      {children}
    </Link>
  );
}
