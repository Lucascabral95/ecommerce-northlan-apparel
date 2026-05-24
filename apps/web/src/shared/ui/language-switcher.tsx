'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

const localeLabels: Record<AppLocale, string> = {
  en: 'EN',
  es: 'ES',
};

export function LanguageSwitcher() {
  const activeLocale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('navigation');

  function switchLocale(locale: AppLocale) {
    if (locale === activeLocale) {
      return;
    }

    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale });
  }

  return (
    <div
      aria-label={t('language')}
      className="flex rounded-full border border-[var(--line)] bg-[var(--paper-solid)] p-1"
      role="group"
    >
      {routing.locales.map((locale) => (
        <button
          aria-pressed={locale === activeLocale}
          className={`min-h-8 rounded-full px-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] transition ${
            locale === activeLocale
              ? 'bg-[var(--ink)] text-[var(--paper-solid)]'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
          key={locale}
          onClick={() => switchLocale(locale)}
          type="button"
        >
          {localeLabels[locale]}
        </button>
      ))}
    </div>
  );
}
