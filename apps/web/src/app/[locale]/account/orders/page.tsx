import { localizedMetadata } from '../../../../i18n/metadata';
import { OrdersPageContent } from '../../../../features/account/orders-page-content';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'ordersTitle');

export default function OrdersPage() {
  return <OrdersPageContent />;
}
