import type { Metadata } from 'next';
import { ProductDirectory } from '../../../features/catalog/product-directory';

export const metadata: Metadata = {
  title: 'Category',
};

export default async function CategoryPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const title = slug
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

  return (
    <ProductDirectory
      initialFilters={{ categorySlug: slug }}
      title={title}
    />
  );
}
