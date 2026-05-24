import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  defaultLocale: 'es',
  localePrefix: 'always',
  locales: ['es', 'en'],
});

export type AppLocale = (typeof routing.locales)[number];
