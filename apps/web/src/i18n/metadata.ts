import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type messages from './messages/en.json';
import type { AppLocale } from './routing';
import { routing } from './routing';

type MetadataParams = Readonly<{ params: Promise<{ locale: string }> }>;
type MetadataKey = keyof (typeof messages)['metadata'];

export async function localizedMetadata(
  { params }: MetadataParams,
  titleKey: MetadataKey,
  descriptionKey?: MetadataKey,
): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: AppLocale = hasLocale(routing.locales, rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    description: descriptionKey ? t(descriptionKey) : undefined,
    title: t(titleKey),
  };
}
