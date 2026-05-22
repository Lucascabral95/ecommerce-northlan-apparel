import type { Metadata } from 'next';
import { OrderDetailPageContent } from '../../../../features/account/order-detail-page-content';

export const metadata: Metadata = {
  title: 'Order detail',
};

export default async function OrderDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return <OrderDetailPageContent id={id} />;
}
