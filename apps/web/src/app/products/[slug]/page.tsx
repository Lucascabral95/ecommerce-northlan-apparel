import type { ProductDto } from '@northlane/contracts';
import type { Metadata } from 'next';
import { ProductPageContent } from '../../../features/catalog/product-page-content';
import { publicServerRequest } from '../../../shared/api/public-server';

type ProductPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await publicServerRequest<ProductDto>(`/products/${encodeURIComponent(slug)}`);
    return {
      description: product.seoDescription ?? product.shortDescription,
      title: product.seoTitle ?? product.title,
    };
  } catch {
    return {
      title: 'Product',
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  return <ProductPageContent slug={slug} />;
}
