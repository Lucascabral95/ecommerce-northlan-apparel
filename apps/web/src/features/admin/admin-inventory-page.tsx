'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { AdjustStockMode, ProductDto, ProductVariantDto } from '@northlane/contracts';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorState, LoadingCards } from '../../shared/ui/states';
import { useAdjustAdminStock, useAdminProducts } from './admin-hooks';

const stockModes = ['SET', 'INCREMENT', 'DECREMENT'] as const satisfies readonly AdjustStockMode[];
const stockSchema = z.object({
  mode: z.enum(stockModes),
  quantity: z.number().int().min(0),
  reason: z.string().trim().min(6, 'Record why stock changes.').max(240),
});

type StockValues = z.infer<typeof stockSchema>;

export function AdminInventoryPage() {
  const products = useAdminProducts();
  const variants = products.data?.items.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );

  return (
    <div className="grid gap-5">
      <header className="surface rounded-[2.4rem] p-6">
        <p className="eyebrow">Inventory service</p>
        <h1 className="display-title mt-4 text-6xl md:text-8xl">Stock</h1>
        <p className="mt-4 max-w-3xl text-[var(--muted)]">
          Adjust each catalog variant through the Inventory Gateway command. Catalog quantities shown
          here are the loaded snapshots; accepted adjustments return inventory receipts.
        </p>
      </header>
      {products.isPending ? <LoadingCards count={4} /> : null}
      {products.error ? <ErrorState message={products.error.message} /> : null}
      {variants?.length === 0 ? (
        <EmptyState
          description="Create product variants before making stock adjustments."
          title="No variants available."
        />
      ) : null}
      <div className="grid gap-4">
        {variants?.map(({ product, variant }) => (
          <StockCard key={variant.id} product={product} variant={variant} />
        ))}
      </div>
    </div>
  );
}

function StockCard({
  product,
  variant,
}: Readonly<{ product: ProductDto; variant: ProductVariantDto }>) {
  const mutation = useAdjustAdminStock();
  const form = useForm<StockValues>({
    defaultValues: {
      mode: 'SET',
      quantity: variant.stock,
      reason: 'Admin stock reconciliation',
    },
    resolver: zodResolver(stockSchema),
  });
  const receipt = mutation.data?.variantId === variant.id ? mutation.data : undefined;

  return (
    <article className="surface grid gap-4 rounded-[1.8rem] p-5 xl:grid-cols-[1fr_1.25fr] xl:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{product.title}</h2>
          <span className="rounded-full border border-[var(--line)] bg-white/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
            {variant.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {variant.sku} · {variant.colorName} · {variant.size}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <StockFigure label="Catalog stock" value={variant.stock} />
          <StockFigure label="Reserved" value={variant.reservedStock} />
          <StockFigure label="Available" value={variant.availableStock} />
          {receipt ? <StockFigure label="Inventory receipt" value={receipt.availableStock} /> : null}
        </div>
      </div>

      <form
        className="grid gap-3 rounded-[1.4rem] border border-[var(--line)] bg-white/42 p-4 md:grid-cols-[10rem_10rem_1fr_auto] md:items-end"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({
            ...values,
            productId: product.id,
            sku: variant.sku,
            variantId: variant.id,
          }),
        )}
      >
        <Field error={form.formState.errors.mode?.message} label="Mode">
          <select className="field" {...form.register('mode')}>
            {stockModes.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </Field>
        <Field error={form.formState.errors.quantity?.message} label="Quantity">
          <input className="field" type="number" {...form.register('quantity', { valueAsNumber: true })} />
        </Field>
        <Field error={form.formState.errors.reason?.message} label="Reason">
          <input className="field" {...form.register('reason')} />
        </Field>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Sending' : 'Adjust'}
        </Button>
      </form>
    </article>
  );
}

function StockFigure({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <span className="rounded-2xl border border-[var(--line)] bg-white/45 px-3 py-2">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>{' '}
      <strong>{value}</strong>
    </span>
  );
}

function Field({
  children,
  error,
  label,
}: Readonly<{ children: React.ReactNode; error?: string; label: string }>) {
  return (
    <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
      {label}
      {children}
      {error ? <span className="normal-case tracking-normal text-red-800">{error}</span> : null}
    </label>
  );
}
