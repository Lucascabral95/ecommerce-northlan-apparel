import type { Metadata } from 'next';
import { ProductDirectory } from '../../../features/catalog/product-directory';

export const metadata: Metadata = {
  title: 'Category',
};

export default async function CategoryPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  return (
    <ProductDirectory
      initialFilters={{ categorySlug: slug }}
      title={`${slug.replaceAll('-', ' ')} edit`}
    />
  );
}
