import { localizedMetadata } from '../../../../i18n/metadata';
import { AdminUsersPage } from '../../../../features/admin/admin-users-page';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'adminUsersTitle');

export default function AdminUsersRoute() {
  return <AdminUsersPage />;
}
