'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { OrderDto, OrderStatus } from '@northlane/contracts';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { formatDate, formatMoney } from '../../shared/format';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorState, LoadingCards } from '../../shared/ui/states';
import { useAdminOrders, useUpdateAdminOrderStatus } from './admin-hooks';

const orderStatuses = [
  'PENDING',
  'STOCK_RESERVED',
  'PAYMENT_PENDING',
  'PAID',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'FAILED',
  'REFUNDED',
] as const satisfies readonly OrderStatus[];

const orderStatusSchema = z.object({
  reason: z.string().trim().max(240).optional(),
  status: z.enum(orderStatuses),
});

type OrderStatusValues = z.infer<typeof orderStatusSchema>;

export function AdminOrdersPage() {
  const orders = useAdminOrders();

  return (
    <div className="grid gap-5">
      <header className="surface rounded-[2.4rem] p-6">
        <p className="eyebrow">Fulfillment desk</p>
        <h1 className="display-title mt-4 text-6xl md:text-8xl">Orders</h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)]">
          Review checkout snapshots and move orders through controlled status transitions.
        </p>
      </header>
      {orders.isPending ? <LoadingCards count={3} /> : null}
      {orders.error ? <ErrorState message={orders.error.message} /> : null}
      {orders.data?.length === 0 ? (
        <EmptyState
          description="Checkout will populate order snapshots once the event flow runs."
          title="No orders to manage."
        />
      ) : null}
      <div className="grid gap-4">
        {orders.data?.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: Readonly<{ order: OrderDto }>) {
  const mutation = useUpdateAdminOrderStatus();
  const form = useForm<OrderStatusValues>({
    defaultValues: {
      reason: '',
      status: order.status,
    },
    resolver: zodResolver(orderStatusSchema),
  });

  return (
    <article className="surface grid gap-5 rounded-[2rem] p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold">{order.orderNumber}</h2>
            <StatusPill status={order.status} />
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {formatDate(order.createdAt)} · customer {order.userId} · {order.items.length} items
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/40 p-4 xl:text-right">
          <p className="eyebrow">Grand total</p>
          <strong className="mt-2 block text-2xl">{formatMoney(order.grandTotal, order.currency)}</strong>
        </div>
      </div>

      <div className="grid gap-2 rounded-[1.4rem] border border-[var(--line)] bg-white/34 p-4">
        {order.items.map((item) => (
          <div className="grid gap-1 text-sm sm:grid-cols-[1fr_auto]" key={item.id}>
            <p>
              <span className="font-semibold">{item.quantity}x {item.productTitle}</span>{' '}
              <span className="text-[var(--muted)]">
                {item.sku} · {item.selectedColor} · {item.selectedSize}
              </span>
            </p>
            <strong>{formatMoney(item.total, order.currency)}</strong>
          </div>
        ))}
      </div>

      <form
        className="grid gap-3 rounded-[1.4rem] border border-[var(--line)] bg-white/42 p-4 lg:grid-cols-[14rem_1fr_auto] lg:items-end"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({
            orderId: order.id,
            reason: values.reason || undefined,
            status: values.status,
          }),
        )}
      >
        <Field error={form.formState.errors.status?.message} label="Next status">
          <select className="field" {...form.register('status')}>
            {orderStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>
        <Field error={form.formState.errors.reason?.message} label="Reason">
          <input className="field" placeholder="Manual fulfillment review" {...form.register('reason')} />
        </Field>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Saving' : 'Update'}
        </Button>
      </form>
    </article>
  );
}

function StatusPill({ status }: Readonly<{ status: OrderStatus }>) {
  return (
    <span className="rounded-full border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--paper-solid)]">
      {status}
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
