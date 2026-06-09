'use client';

import type { OrderStatusHistoryDto } from '@northlane/contracts';
import { useTranslations } from 'next-intl';
import { formatDate } from '../../shared/format';

export function OrderTimeline({
  history,
}: Readonly<{ history: readonly OrderStatusHistoryDto[] }>) {
  const t = useTranslations('account.orderDetail');

  return (
    <ol className="surface grid gap-0 rounded-[2rem] p-6">
      <p className="eyebrow mb-5">{t('timeline')}</p>
      {history.map((entry, index) => (
        <li className="grid grid-cols-[1.4rem_1fr] gap-4" key={entry.id}>
          <div className="flex flex-col items-center">
            <span className="mt-1 h-3 w-3 rounded-full bg-[var(--accent)]" />
            {index < history.length - 1 ? <span className="h-full w-px bg-[var(--line)]" /> : null}
          </div>
          <div className="pb-6">
            <p className="font-bold uppercase tracking-[0.18em]">{t(`statuses.${entry.status}`)}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(entry.createdAt)}</p>
            {entry.reason ? <p className="mt-2">{translateOrderReason(entry.reason, t)}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function translateOrderReason(
  reason: string,
  t: ReturnType<typeof useTranslations>,
) {
  const stockReservation = reason.match(/^Stock reservation (.+) completed\.$/);
  if (stockReservation?.[1]) {
    return t('reasons.stockReservationCompleted', { reservationId: stockReservation[1] });
  }

  const mercadoPagoFailure = reason.match(/^Mercado Pago preference creation failed\. (.+)$/);
  if (mercadoPagoFailure?.[1]) {
    return t('reasons.mercadoPagoPreferenceFailed', { detail: mercadoPagoFailure[1] });
  }

  const knownReasons: Record<string, string> = {
    'Checkout was cancelled because the payment session could not be created.':
      'checkoutCancelledPaymentSession',
    'Order created from active cart.': 'orderCreatedFromCart',
    'Payment request prepared after stock reservation.': 'paymentRequestPrepared',
  };

  const reasonKey = knownReasons[reason];
  return reasonKey ? t(`reasons.${reasonKey}`) : reason;
}
