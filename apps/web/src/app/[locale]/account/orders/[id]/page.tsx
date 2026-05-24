import { localizedMetadata } from '../../../../../i18n/metadata';
import { OrderDetailPageContent } from '../../../../../features/account/order-detail-page-content';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'orderDetailTitle');

export default async function OrderDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return <OrderDetailPageContent id={id} />;
}
