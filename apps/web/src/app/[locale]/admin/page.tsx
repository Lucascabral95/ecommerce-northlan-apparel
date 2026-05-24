import { localizedMetadata } from '../../../i18n/metadata';
import { AdminDashboard } from '../../../features/admin/admin-dashboard';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'adminTitle');

export default function AdminPage() {
  return <AdminDashboard />;
}
