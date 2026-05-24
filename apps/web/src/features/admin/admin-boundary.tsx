'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { useAuthStore } from '../auth/auth-store';

export function AdminBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations('admin');
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
        actionLabel={t('login')}
        description={t('signInDescription')}
        title={t('signInTitle')}
      />
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <AdminGate
        actionHref="/"
        actionLabel={t('returnStore')}
        description={t('forbiddenDescription')}
        title={t('forbiddenTitle')}
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
  const t = useTranslations('admin');

  return (
    <section className="page-shell">
      <div className="surface mx-auto max-w-3xl rounded-[2.6rem] p-8 text-center md:p-12">
        <p className="eyebrow">{t('gateEyebrow')}</p>
        <h1 className="display-title mt-5 text-5xl md:text-7xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-[var(--muted)]">{description}</p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold uppercase tracking-[0.08em] ![color:#fff]"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      </div>
    </section>
  );
}
