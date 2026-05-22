'use client';

import { AdminProductForm } from './admin-product-form';
import { useAdminProducts } from './admin-hooks';
import { ErrorState, LoadingCards } from '../../shared/ui/states';

export function AdminProductEditor({ productId }: Readonly<{ productId: string }>) {
  const products = useAdminProducts();
  const product = products.data?.items.find((item) => item.id === productId);

  if (products.isPending) {
    return <LoadingCards count={3} />;
  }

  if (products.error) {
    return <ErrorState message={products.error.message} />;
  }

  if (!product) {
    return (
      <ErrorState message="Product was not found in the admin catalog page window. The Gateway does not expose an admin get-by-id endpoint yet." />
    );
  }

  return (
    <div className="grid gap-5">
      <header className="surface rounded-[2.4rem] p-6">
        <p className="eyebrow">Edit catalog record</p>
        <h1 className="display-title mt-4 text-6xl md:text-8xl">{product.title}</h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)]">
          This editor patches product copy, variants and media through the API Gateway.
        </p>
      </header>
      <AdminProductForm key={product.id} product={product} />
    </div>
  );
}
