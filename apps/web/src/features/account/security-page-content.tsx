'use client';

import Link from 'next/link';
import { useAuthStore } from '../auth/auth-store';

export function SecurityPageContent() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);

  const signedInEmail = hasHydrated ? user?.email ?? 'No account signed in' : 'Checking session';
  const sessionStatus = hasHydrated ? (user ? 'Active on this device' : 'Signed out') : 'Checking';

  return (
    <div>
      <p className="eyebrow">Security</p>
      <h1 className="display-title mt-4 text-6xl md:text-8xl">Protect your account</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
        Review how your account is being used on this device and keep your sign-in details up to
        date.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <SecuritySummary label="Signed in as" value={signedInEmail} />
        <SecuritySummary label="Session" value={sessionStatus} />
        <SecuritySummary label="Access level" value={user?.role === 'ADMIN' ? 'Administrator' : 'Standard account'} />
      </div>

      <section className="surface mt-6 grid gap-6 rounded-[2rem] p-6 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="eyebrow">What this means</p>
          <div className="mt-5 grid gap-4">
            <SecurityNote
              description="Your current sign-in stays active while you browse, shop and manage your account."
              title="You do not need to sign in again during normal use"
            />
            <SecurityNote
              description="If you use a shared or public computer, signing out removes your account from this browser."
              title="Sign out when you finish on shared devices"
            />
            <SecurityNote
              description="Password updates and device-by-device session management are planned for a later release."
              title="More account controls are coming"
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/45 p-5">
          <p className="eyebrow">Quick actions</p>
          <div className="mt-5 grid gap-3">
            <QuickLink href="/account/profile">Review profile details</QuickLink>
            <QuickLink href="/account/addresses">Check saved addresses</QuickLink>
            <QuickLink href="/account/orders">Open order history</QuickLink>
            <button
              className="cursor-pointer rounded-full border border-[var(--line)] bg-[var(--ink)] px-5 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--paper-solid)] transition hover:bg-[var(--accent)]"
              onClick={clearSession}
              type="button"
            >
              Sign out on this device
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SecuritySummary({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <article className="surface rounded-[1.8rem] p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-5 text-lg font-semibold leading-7">{value}</p>
    </article>
  );
}

function SecurityNote({
  description,
  title,
}: Readonly<{
  description: string;
  title: string;
}>) {
  return (
    <article className="rounded-[1.3rem] border border-[var(--line)] bg-white/36 p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{description}</p>
    </article>
  );
}

function QuickLink({
  children,
  href,
}: Readonly<{
  children: React.ReactNode;
  href: '/account/addresses' | '/account/orders' | '/account/profile';
}>) {
  return (
    <Link
      className="rounded-full border border-[var(--line)] bg-white/52 px-5 py-3 text-sm font-bold uppercase tracking-[0.14em] transition hover:bg-white/72"
      href={href}
    >
      {children}
    </Link>
  );
}
