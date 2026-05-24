import { localizedMetadata } from '../../../../i18n/metadata';
import { ProductDirectory } from '../../../../features/catalog/product-directory';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'categoryTitle');

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
