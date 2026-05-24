import { localizedMetadata } from '../../../../i18n/metadata';
import { AdminProductsPage } from '../../../../features/admin/admin-products-page';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'adminProductsTitle');

export default function AdminProductsRoute() {
  return <AdminProductsPage />;
}
