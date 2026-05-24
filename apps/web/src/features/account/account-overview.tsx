'use client';

import { Link } from '@/i18n/navigation';
import { useAddresses, useOrders, useProfile } from './account-hooks';

export function AccountOverview() {
  const profile = useProfile();
  const addresses = useAddresses();
  const orders = useOrders();

  return (
    <div>
      <p className="eyebrow">Account</p>
      <h1 className="display-title mt-4 text-6xl md:text-8xl">
        {profile.data?.firstName ? `${profile.data.firstName}'s lane` : 'Your lane'}
      </h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Summary label="Orders" value={(orders.data?.length ?? 0).toString()} />
        <Summary label="Addresses" value={(addresses.data?.length ?? 0).toString()} />
        <Summary label="Email" value={profile.data?.email ?? 'Loading'} />
      </div>
      <div className="surface mt-5 flex flex-wrap gap-3 rounded-[2rem] p-6">
        <AccountLink href="/account/profile">Edit profile</AccountLink>
        <AccountLink href="/account/addresses">Add address</AccountLink>
        <AccountLink href="/account/orders">View orders</AccountLink>
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
