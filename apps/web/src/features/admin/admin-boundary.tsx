'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, ReactNode } from 'react';
import { useAuthStore } from '../auth/auth-store';

export function AdminBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);

  if (!hasHydrated) {
    return <div className="page-shell min-h-[58vh] animate-pulse" />;
  }

  if (!user) {
    return (
      <AdminGate
        actionHref={`/login?next=${encodeURIComponent(pathname)}`}
        actionLabel="Admin login"
        description="Management APIs require a signed JWT and the gateway enforces the admin guard."
        title="Sign in before entering operations."
      />
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <AdminGate
        actionHref="/"
        actionLabel="Return to store"
        description="This workspace is reserved for catalog, stock and order operations."
        title="Your account does not have admin access."
      />
    );
  }

  return children;
}

function AdminGate({
  actionHref,
  actionLabel,
  description,
  title,
}: Readonly<{
  actionHref: ComponentProps<typeof Link>['href'];
  actionLabel: string;
  description: string;
  title: string;
}>) {
  return (
    <section className="page-shell">
      <div className="surface mx-auto max-w-3xl rounded-[2.6rem] p-8 text-center md:p-12">
        <p className="eyebrow">Northlane control room</p>
        <h1 className="display-title mt-5 text-5xl md:text-7xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-[var(--muted)]">{description}</p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--paper-solid)]"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      </div>
    </section>
  );
}
