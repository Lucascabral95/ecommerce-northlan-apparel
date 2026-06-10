'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { formatDate, formatMoney } from '../../shared/format';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { useOrders, useSyncPendingPaymentOrders } from './account-hooks';

export function OrdersPageContent() {
  const t = useTranslations('account.ordersPage');
  const orders = useOrders();
  useSyncPendingPaymentOrders(
    orders.data
      ?.filter((order) => order.status === 'PAYMENT_PENDING')
      .map((order) => order.id),
  );

  return (
    <div>
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1 className="display-title mt-4 text-6xl md:text-8xl">{t('title')}</h1>
      <div className="mt-7 grid gap-3">
        {orders.error ? <ErrorState message={orders.error.message} /> : null}
        {orders.data?.length === 0 ? (
          <EmptyState
            description={t('emptyDescription')}
            title={t('emptyTitle')}
          />
        ) : null}
        {orders.data?.map((order) => (
          <Link
            className="surface grid gap-3 rounded-[1.6rem] p-5 transition hover:-translate-y-0.5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            href={`/account/orders/${order.id}`}
            key={order.id}
          >
            <div>
              <p className="font-semibold">{order.orderNumber}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(order.createdAt)}</p>
            </div>
            <span className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
              {order.status}
            </span>
            <strong>{formatMoney(order.grandTotal, order.currency)}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}
