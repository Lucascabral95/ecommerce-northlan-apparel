import type { ProductDto } from '@northlane/contracts';
import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '../../../../i18n/routing';
import { routing } from '../../../../i18n/routing';
import { ProductPageContent } from '../../../../features/catalog/product-page-content';
import { publicServerRequest } from '../../../../shared/api/public-server';

type ProductPageProps = Readonly<{ params: Promise<{ locale: string; slug: string }> }>;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: AppLocale = hasLocale(routing.locales, rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  try {
    const product = await publicServerRequest<ProductDto>(`/products/${encodeURIComponent(slug)}`);
    return {
      description: product.seoDescription ?? product.shortDescription,
      title: product.seoTitle ?? product.title,
    };
  } catch {
    return {
      title: t('productFallbackTitle'),
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  return <ProductPageContent slug={slug} />;
}
