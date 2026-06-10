'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { formatMoney } from '../../shared/format';
import { ErrorState } from '../../shared/ui/states';
import { useOrder, useSyncPendingPaymentOrders } from './account-hooks';
import { OrderTimeline } from './order-timeline';

export function OrderDetailPageContent({ id }: Readonly<{ id: string }>) {
  const t = useTranslations('account.orderDetail');
  const order = useOrder(id);
  useSyncPendingPaymentOrders(order.data?.status === 'PAYMENT_PENDING' ? [order.data.id] : []);

  if (order.error) {
    return <ErrorState message={order.error.message} />;
  }

  if (!order.data) {
    return <div className="min-h-[52vh] animate-pulse rounded-[2rem] bg-black/6" />;
  }

  return (
    <div>
      <p className="eyebrow">{order.data.orderNumber}</p>
      <h1 className="display-title mt-4 text-6xl md:text-8xl">
        {t(`statuses.${order.data.status}`)}
      </h1>
      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_25rem]">
        <section className="surface rounded-[2rem] p-6">
          <p className="eyebrow mb-5">{t('items')}</p>
          <div className="grid gap-4">
            {order.data.items.map((item) => (
              <article className="grid grid-cols-[5rem_1fr_auto] gap-4" key={item.id}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black/8">
                  {item.productImage ? (
                    <Image
                      alt={item.productTitle}
                      className="object-cover"
                      fill
                      sizes="80px"
                      src={item.productImage}
                    />
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold">{item.productTitle}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {t('itemDescription', {
                      color: item.selectedColor,
                      quantity: item.quantity,
                      size: item.selectedSize,
                    })}
                  </p>
                </div>
                <strong>{formatMoney(item.total, order.data.currency)}</strong>
              </article>
            ))}
          </div>
          <p className="mt-6 border-t border-[var(--line)] pt-5 text-right text-2xl font-semibold">
            {formatMoney(order.data.grandTotal, order.data.currency)}
          </p>
        </section>
        <OrderTimeline history={order.data.statusHistory} />
      </div>
    </div>
  );
}
