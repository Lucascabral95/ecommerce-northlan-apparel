import type { Metadata } from 'next';
import { AdminOrdersPage } from '../../../features/admin/admin-orders-page';

export const metadata: Metadata = {
  title: 'Admin orders',
};

export default function AdminOrdersRoute() {
  return <AdminOrdersPage />;
}
