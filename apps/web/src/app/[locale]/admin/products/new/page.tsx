import { localizedMetadata } from '../../../../../i18n/metadata';
import { AdminProductForm } from '../../../../../features/admin/admin-product-form';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'newProductTitle');

export default function NewAdminProductPage() {
  return (
    <div className="grid gap-5">
      <header className="surface rounded-[2.4rem] p-6">
        <p className="eyebrow">Catalog creation</p>
        <h1 className="display-title mt-4 text-6xl md:text-8xl">New product</h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)]">
          Publish apparel data, SEO copy, sellable variants and media through a single controlled
          product command.
        </p>
      </header>
      <AdminProductForm />
    </div>
  );
}
