'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useAuthStore } from './auth-store';

export function ProtectedBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations('account');
  const pathname = usePathname();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);

  if (!hasHydrated) {
    return <div className="page-shell min-h-[52vh] animate-pulse" />;
  }

  if (!user) {
    return (
      <section className="page-shell">
        <div className="surface mx-auto max-w-2xl rounded-[2.5rem] p-8 text-center md:p-12">
          <p className="eyebrow">{t('privateEyebrow')}</p>
          <h1 className="display-title mt-5 text-5xl">{t('signInTitle')}</h1>
          <p className="mt-5 text-[var(--muted)]">
            {t('signInDescription')}
          </p>
          <Link className="mt-7 inline-block" href={`/login?next=${encodeURIComponent(pathname)}`}>
            <span className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--paper-solid)]">
              {t('goToLogin')}
            </span>
          </Link>
        </div>
      </section>
    );
  }

  return children;
}
