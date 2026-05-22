import type { Metadata } from 'next';
import { ProductDirectory } from '../../features/catalog/product-directory';

export const metadata: Metadata = {
  description: 'Shop apparel by category, size, color, brand and price.',
  title: 'Products',
};

export default function ProductsPage() {
  return <ProductDirectory />;
}
