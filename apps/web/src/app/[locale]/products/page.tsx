import { localizedMetadata } from '../../../i18n/metadata';
import { ProductDirectory } from '../../../features/catalog/product-directory';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'productsTitle', 'productsDescription');

export default function ProductsPage() {
  return <ProductDirectory />;
}
