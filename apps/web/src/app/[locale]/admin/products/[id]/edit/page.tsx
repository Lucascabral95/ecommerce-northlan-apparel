import { localizedMetadata } from '../../../../../../i18n/metadata';
import { AdminProductEditor } from '../../../../../../features/admin/admin-product-editor';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'editProductTitle');

export default async function EditAdminProductPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return <AdminProductEditor productId={id} />;
}
