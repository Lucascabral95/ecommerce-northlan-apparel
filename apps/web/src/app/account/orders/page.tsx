import type { Metadata } from 'next';
import { OrdersPageContent } from '../../../features/account/orders-page-content';

export const metadata: Metadata = {
  title: 'Orders',
};

export default function OrdersPage() {
  return <OrdersPageContent />;
}
