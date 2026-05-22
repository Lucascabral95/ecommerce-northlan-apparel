import type { Metadata } from 'next';
import { AdminInventoryPage } from '../../../features/admin/admin-inventory-page';

export const metadata: Metadata = {
  title: 'Admin inventory',
};

export default function AdminInventoryRoute() {
  return <AdminInventoryPage />;
}
