'use client';

import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useOrder } from '../account/account-hooks';
import { ErrorState } from '../../shared/ui/states';

export function PaymentReturnPageContent({
  outcome,
}: Readonly<{ outcome: 'failure' | 'pending' | 'success' }>) {
  const t = useTranslations('checkout.paymentReturn');
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? searchParams.get('external_reference');
  const order = useOrder(orderId ?? '');

  return (
    <section className="page-shell">
      <div className="surface mx-auto max-w-3xl rounded-[2rem] p-8">
        <p className="eyebrow">{t(`${outcome}.eyebrow`)}</p>
        <h1 className="display-title mt-4 text-5xl md:text-7xl">{t(`${outcome}.title`)}</h1>
        <p className="mt-5 max-w-2xl text-[var(--muted)]">{t(`${outcome}.description`)}</p>

        {!orderId ? (
          <ErrorState message={t('missingOrder')} />
        ) : order.error ? (
          <ErrorState message={order.error.message} />
        ) : order.data ? (
          <div className="mt-8 rounded-[1.5rem] border border-[var(--line)] bg-white/55 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
              {t('currentStatus')}
            </p>
            <p className="mt-2 text-3xl font-semibold">{order.data.status}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{order.data.orderNumber}</p>
          </div>
        ) : (
          <div className="mt-8 min-h-32 animate-pulse rounded-[1.5rem] bg-black/6" />
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {orderId ? (
            <Link className="btn-primary" href={`/account/orders/${orderId}`}>
              {t('viewOrder')}
            </Link>
          ) : null}
          <Link className="btn-secondary" href="/account/orders">
            {t('orderHistory')}
          </Link>
          {outcome === 'failure' ? (
            <Link className="btn-secondary" href="/cart">
              {t('retry')}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
