import type { Metadata } from 'next';
import { AdminUsersPage } from '../../../features/admin/admin-users-page';

export const metadata: Metadata = {
  title: 'Admin users',
};

export default function AdminUsersRoute() {
  return <AdminUsersPage />;
}
