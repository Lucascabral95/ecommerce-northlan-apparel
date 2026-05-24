import { hasLocale } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomeMarquee } from '../../features/home/home-marquee';
import { Footer } from '../../shared/ui/footer';
import { Header } from '../../shared/ui/header';
import type { AppLocale } from '../../i18n/routing';
import { routing } from '../../i18n/routing';
import { AppProviders } from '../providers';
import '../globals.css';

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: AppLocale = hasLocale(routing.locales, rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        es: '/es',
      },
    },
    description: t('defaultDescription'),
    title: {
      default: t('defaultTitle'),
      template: `%s | ${t('defaultTitle')}`,
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <AppProviders>
            <div className="site-frame">
              <HomeMarquee />
              <Header />
              <main className="site-main">{children}</main>
              <Footer />
            </div>
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
