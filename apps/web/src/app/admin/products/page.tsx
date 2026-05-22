import type { Metadata } from 'next';
import { AdminProductsPage } from '../../../features/admin/admin-products-page';

export const metadata: Metadata = {
  title: 'Admin products',
};

export default function AdminProductsRoute() {
  return <AdminProductsPage />;
}
