import type { Metadata } from 'next';
import { AdminProductEditor } from '../../../../../features/admin/admin-product-editor';

export const metadata: Metadata = {
  title: 'Edit product',
};

export default async function EditAdminProductPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return <AdminProductEditor productId={id} />;
}
