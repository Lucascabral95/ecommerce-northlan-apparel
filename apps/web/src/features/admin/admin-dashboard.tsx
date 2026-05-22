'use client';

import Link from 'next/link';
import type { OrderDto } from '@northlane/contracts';
import { formatDate, formatMoney } from '../../shared/format';
import { EmptyState, ErrorState, LoadingCards } from '../../shared/ui/states';
import { useAdminOrders, useAdminProducts } from './admin-hooks';

export function AdminDashboard() {
  const products = useAdminProducts();
  const orders = useAdminOrders();
  const productItems = products.data?.items ?? [];
  const orderItems = orders.data ?? [];
  const completedRevenue = orderItems
    .filter((order) => ['CONFIRMED', 'DELIVERED', 'PAID', 'PREPARING', 'SHIPPED'].includes(order.status))
    .reduce((total, order) => total + order.grandTotal, 0);
  const lowStockVariants = productItems.flatMap((product) =>
    product.variants
      .filter((variant) => variant.availableStock <= 5)
      .map((variant) => ({ product, variant })),
  );

  return (
    <div className="grid gap-6">
      <header className="surface overflow-hidden rounded-[2.6rem] p-6 md:p-9">
        <p className="eyebrow">Northlane operations</p>
        <div className="mt-4 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="display-title text-6xl md:text-8xl">Merchandise control.</h1>
            <p className="mt-5 max-w-2xl text-[var(--muted)]">
              Product publishing, inventory adjustments and order state transitions stay behind the
              Gateway admin guard.
            </p>
          </div>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--paper-solid)]"
            href="/admin/products/new"
          >
            New product
          </Link>
        </div>
      </header>

      {products.isPending || orders.isPending ? <LoadingCards count={4} /> : null}
      {products.error ? <ErrorState message={products.error.message} /> : null}
      {orders.error ? <ErrorState message={orders.error.message} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Catalog SKUs" value={productItems.length.toString()} />
        <MetricCard
          label="Active products"
          value={productItems.filter((product) => product.isActive).length.toString()}
        />
        <MetricCard label="Orders observed" value={orderItems.length.toString()} />
        <MetricCard
          label="Realized gross"
          value={formatMoney(completedRevenue, orderItems[0]?.currency ?? 'USD')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <section className="surface rounded-[2rem] p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Queue for review</p>
              <h2 className="display-title mt-3 text-4xl">Recent orders</h2>
            </div>
            <Link className="text-sm font-bold uppercase tracking-[0.16em]" href="/admin/orders">
              Open
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {orderItems.length === 0 && !orders.isPending ? (
              <EmptyState
                description="Orders will arrive here after checkout events complete."
                title="No orders yet."
              />
            ) : null}
            {orderItems.slice(0, 5).map((order) => (
              <OrderSummary key={order.id} order={order} />
            ))}
          </div>
        </section>

        <section className="surface rounded-[2rem] p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Stock signal</p>
              <h2 className="display-title mt-3 text-4xl">Low availability</h2>
            </div>
            <Link className="text-sm font-bold uppercase tracking-[0.16em]" href="/admin/inventory">
              Adjust
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {lowStockVariants.length === 0 && !products.isPending ? (
              <EmptyState
                description="Every loaded catalog variant has more than five available units."
                title="Stock looks stable."
              />
            ) : null}
            {lowStockVariants.slice(0, 6).map(({ product, variant }) => (
              <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/40 p-4" key={variant.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{product.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {variant.sku} · {variant.colorName} · {variant.size}
                    </p>
                  </div>
                  <strong className="rounded-full bg-[var(--ink)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--paper-solid)]">
                    {variant.availableStock}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <article className="surface rounded-[1.8rem] p-5">
      <p className="eyebrow">{label}</p>
      <p className="display-title mt-5 text-5xl">{value}</p>
    </article>
  );
}

function OrderSummary({ order }: Readonly<{ order: OrderDto }>) {
  return (
    <article className="grid gap-3 rounded-[1.4rem] border border-[var(--line)] bg-white/40 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="font-semibold">{order.orderNumber}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {formatDate(order.createdAt)} · {order.items.length} items
        </p>
      </div>
      <div className="sm:text-right">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">{order.status}</p>
        <strong>{formatMoney(order.grandTotal, order.currency)}</strong>
      </div>
    </article>
  );
}
