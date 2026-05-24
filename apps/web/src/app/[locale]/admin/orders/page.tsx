import { localizedMetadata } from '../../../../i18n/metadata';
import { AdminOrdersPage } from '../../../../features/admin/admin-orders-page';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'adminOrdersTitle');

export default function AdminOrdersRoute() {
  return <AdminOrdersPage />;
}
