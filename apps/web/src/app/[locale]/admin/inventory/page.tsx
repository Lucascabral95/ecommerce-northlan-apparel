import { localizedMetadata } from '../../../../i18n/metadata';
import { AdminInventoryPage } from '../../../../features/admin/admin-inventory-page';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'adminInventoryTitle');

export default function AdminInventoryRoute() {
  return <AdminInventoryPage />;
}
